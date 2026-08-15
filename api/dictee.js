import { requireUser } from "./_lib/auth.js";
import { HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { TTS_MODEL_NAME } from "./_lib/tts.js";
import { logAiUsage, logAiFailure } from "./_lib/usage.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import {
  listSujets, readCached, patchCached, mintDictee, synthesizeGroups, isComplete,
  splitGroups, generatedToday, DAILY_TOTAL,
} from "./_lib/dictee.js";

// Serves one dictée: a sujet from the Expression écrite archive, the C1/C2
// model answer written for it, and that answer read aloud in sense groups.
//
// ACCESS. Any signed-in account, free or paid — the dictée sits on the free
// Pratique tab. To make it Premium later, swap `requireUser` for
// `requirePremium` on the line below and add `dictee: PREMIUM` to PAGE_ACCESS
// in src/auth/rbac.js; nothing else needs to change. The rate limit stays
// either way: it is what stops a script from driving the generator, and that
// is a separate concern from who is allowed in.
const requireAccess = requireUser;

// WHERE THE TEXTS COME FROM. Almost every request is answered out of the
// library — api/cron/dictee-seed.js writes three new texts a night, and every
// text ever written stays available for ever, so the collection a candidate
// can practise on grows by three a day and never shrinks.
//
// A request only ever generates when it names a sujet nobody has dictated yet
// AND the day's budget has something left in it (see DAILY_TOTAL). That is the
// case the intro calls "un sujet inédit": someone who has worked through
// everything in the library can still add to it, and what they add is cached
// and handed to everyone else exactly like a seeded text.
//
// This is also why nobody waits any more. Generation used to happen on a draw,
// so whoever drew an uncached sujet paid ten seconds of Groq and Azure for the
// privilege; now that the cron does it in the small hours, the ordinary path is
// a single indexed read.

export default async function handler(req, res) {
  let user = null;
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    user = await requireAccess(req);
    // Generous, because a library hit costs nothing and nearly every call is
    // one; low enough that a script cannot walk the whole archive.
    await enforceRateLimit(req, { name: "dictee", limit: 20, windowSeconds: 300, userId: user.id });

    const task = Number(req.body?.task);
    if (![1, 2, 3].includes(task)) throw new HttpError(400, "Tâche inconnue.");
    const wanted = typeof req.body?.sujetKey === "string" ? req.body.sujetKey : null;
    // Keys the candidate has already taken down, sent by the client from its
    // own history so a random draw does not hand back last week's dictée.
    const exclude = new Set(Array.isArray(req.body?.exclude) ? req.body.exclude.slice(0, 60).map(String) : []);

    const pool = (await listSujets(req)).filter((s) => s.task === task);
    if (!pool.length) throw new HttpError(404, "Aucun sujet disponible pour cette tâche.");

    /* ---- the sujet ---- */
    let sujet;
    if (wanted) {
      sujet = pool.find((s) => s.key === wanted);
      if (!sujet) throw new HttpError(404, "Sujet introuvable.");
    } else {
      // No key named: draw one the candidate has not done, preferring anything
      // already in the library so the common case stays instant.
      const fresh = pool.filter((s) => !exclude.has(s.key));
      const from = fresh.length ? fresh : pool;
      sujet = from[Math.floor(Math.random() * from.length)];
    }

    let row = await readCached(sujet.key, task);
    let groups = Array.isArray(row?.groups) ? row.groups : [];

    /* ---- a row from before the dictation moved to sense groups ---- */
    // Its text is already written, so the groups are a re-derivation and
    // nothing more: no Groq call, no slot spent, and — the part that matters —
    // the text stays the one anybody with this dictée in their history was
    // actually scored against. Regenerating would have silently replaced it.
    if (!groups.length && row?.text) {
      const derived = splitGroups(row.text);
      // The join is what the candidate is scored on. If it does not rebuild the
      // stored text, the row is left alone and the mint path below handles it.
      if (derived.length && derived.join(" ") === row.text) {
        groups = derived;
        await patchCached(row.id, { groups });
      } else {
        console.warn(`dictee: ${sujet.key} tâche ${task} — le texte en cache ne se redécoupe pas, régénération`);
      }
    }

    /* ---- not in the library at all: spend a slot, or say so ---- */
    let justMinted = false;
    if (!groups.length) {
      const used = await generatedToday();
      if (used >= DAILY_TOTAL) {
        // Deliberately a 409 and not a 500: nothing failed. The client turns
        // this into "revenez demain, ou choisissez dans la bibliothèque".
        throw new HttpError(409, "Les dictées inédites du jour sont épuisées. La bibliothèque reste ouverte, et trois nouveaux textes arrivent cette nuit.");
      }
      const minted = await mintDictee(sujet);
      logAiUsage({
        userId: user.id, endpoint: "dictee", kind: "chat",
        model: minted.chat.model || CHAT_MODEL_NAME, usage: minted.chat.usage, durationMs: minted.chat.ms,
      });
      if (minted.tts) {
        // Neural TTS bills per character, so characters are what is metered.
        logAiUsage({
          userId: user.id, endpoint: "dictee", kind: "tts", model: TTS_MODEL_NAME,
          usage: { total_tokens: minted.tts.chars }, audioBytes: minted.tts.bytes, durationMs: minted.tts.ms,
        });
      }
      row = {
        id: minted.row.id, level: minted.row.level, words: minted.row.words,
        groups: minted.row.groups, groups_audio: minted.row.groupsAudio,
      };
      groups = minted.row.groups;
      justMinted = true;
    }

    /* ---- recordings: cached, or made once and repaired into the row ---- */
    let audio = isComplete(row.groups_audio, groups) ? row.groups_audio : null;
    // `justMinted` is what stops a second full synthesis in the same request.
    // mintDictee has already tried, and it only comes back empty when Azure is
    // unconfigured or down — retrying twenty groups against a dead endpoint is
    // the one thing that can push this handler past its sixty seconds, and it
    // would fail identically. The client reads the text with the browser's own
    // voice, and the next draw repairs the row.
    if (!audio && !justMinted) {
      const ttsStart = Date.now();
      const made = await synthesizeGroups(groups);
      if (made) {
        audio = made.audio;
        logAiUsage({
          userId: user.id, endpoint: "dictee", kind: "tts", model: TTS_MODEL_NAME,
          usage: { total_tokens: made.chars }, audioBytes: made.bytes, durationMs: Date.now() - ttsStart,
        });
        // Repairs a row whose recording was missing OR only partly made — a
        // throttled synthesis leaves holes, and testing `!row.groups_audio`
        // alone would see a non-empty array and leave them there for good.
        await patchCached(row.id, { groups_audio: audio });
      }
    }

    res.status(200).json({
      id: row.id,
      sujetKey: sujet.key,
      task,
      level: row.level || "C1",
      words: row.words || 0,
      prompt: sujet.prompt,
      theme: sujet.theme || null,
      month: { year: sujet.year, monthNum: sujet.monthNum, n: sujet.n },
      // The finest units of the text, in reading order. The client joins runs
      // of them into whatever listening length the candidate chose — see
      // src/utils/dicteeSegments.js.
      groups,
      // Index-aligned with `groups`; a null entry means "no recording for this
      // one", and the client voices it with the browser's own speech.
      audio: audio || groups.map(() => null),
      audioMime: "audio/mpeg",
    });
  } catch (err) {
    // ONLY a real Groq refusal is recorded as one. `upstreamStatus` is set by
    // groq.js and only once Groq actually answered, so it is the signal that
    // separates "the model refused us" from "we refused the request" — a bad
    // tâche number, a spent rate limit or an expired session are ours, and
    // filing them under Groq failures makes the admin's refusal chart lie.
    if (typeof err.upstreamStatus === "number") {
      logAiFailure({
        userId: user?.id, endpoint: "dictee", kind: "chat",
        model: err.model || CHAT_MODEL_NAME,
        status: err.upstreamStatus,
        detail: err.upstreamDetail,
        request: err.requestPayload,
      });
    }
    res.status(err.status || 500).json({ error: err.message || "La dictée n'a pas pu être préparée." });
  }
}
