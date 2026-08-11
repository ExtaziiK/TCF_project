import { requireUser } from "./_lib/auth.js";
import { HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { synthesizeFrench, TTS_MODEL_NAME } from "./_lib/tts.js";
import { logAiUsage, logAiFailure } from "./_lib/usage.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import { listSujets, readCached, writeCached, attachAudio, generateText, cachedKeysFor } from "./_lib/dictee.js";

// Serves one dictée: a sujet from the Expression écrite archive, the C1/C2
// model answer written for it, and that answer read aloud sentence by sentence.
//
// ACCESS. Any signed-in account, free or paid — the dictée sits on the free
// Pratique tab. To make it Premium later, swap `requireUser` for
// `requirePremium` on the line below and add `dictee: PREMIUM` to PAGE_ACCESS
// in src/auth/rbac.js; nothing else needs to change. The rate limit stays
// either way: it is what stops a script from driving the generator, and that
// is a separate concern from who is allowed in.
const requireAccess = requireUser;

// A random draw over all 1 428 (sujet, tâche) pairs would miss the cache almost
// every time — every session would pay a Groq call, an Azure synthesis and ten
// seconds of waiting, to produce a text nobody hears twice. So most draws come
// from what has already been written, and a minority extend the library. The
// result is that the common case is instant and free, and the collection still
// grows for as long as people practise.
const FRESH_DRAW_RATE = 0.2;
const LIBRARY_FLOOR = 5; // below this, always generate — there is nothing to draw from yet

// Azure is called once per sentence. Four at a time keeps a ten-sentence text
// inside the function's budget without opening thirty sockets at once.
const TTS_BATCH = 4;

async function synthesize(sentences) {
  const out = new Array(sentences.length).fill(null);
  let bytes = 0;
  let chars = 0;
  for (let i = 0; i < sentences.length; i += TTS_BATCH) {
    const slice = sentences.slice(i, i + TTS_BATCH);
    const done = await Promise.all(slice.map((s) => synthesizeFrench(s)));
    done.forEach((tts, k) => {
      if (!tts) return;
      out[i + k] = tts.audio;
      bytes += tts.bytes;
      chars += slice[k].length;
    });
  }
  // All-null means Azure is unconfigured or down. Not an error: the client
  // reads the sentences with the browser's own voice instead, which is worse
  // but still a dictée. Returning null here tells the caller not to cache it.
  return out.some(Boolean) ? { audio: out, bytes, chars } : null;
}

export default async function handler(req, res) {
  let user = null;
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    user = await requireAccess(req);
    // Generous, because a cache hit costs nothing and most calls are hits; low
    // enough that a script cannot mint hundreds of fresh generations.
    await enforceRateLimit(req, { name: "dictee", limit: 20, windowSeconds: 300, userId: user.id });

    const task = Number(req.body?.task);
    if (![1, 2, 3].includes(task)) throw new HttpError(400, "Tâche inconnue.");
    const wanted = typeof req.body?.sujetKey === "string" ? req.body.sujetKey : null;
    // Keys the candidate has already taken down, sent by the client from its
    // own history so a random draw does not hand back last week's dictée.
    const exclude = new Set(Array.isArray(req.body?.exclude) ? req.body.exclude.slice(0, 60).map(String) : []);

    const pool = (await listSujets(req)).filter((s) => s.task === task);
    if (!pool.length) throw new HttpError(404, "Aucun sujet disponible pour cette tâche.");

    /* ---- choose the sujet ---- */
    let sujet;
    if (wanted) {
      sujet = pool.find((s) => s.key === wanted);
      if (!sujet) throw new HttpError(404, "Sujet introuvable.");
    } else {
      const fresh = pool.filter((s) => !exclude.has(s.key));
      const candidates = fresh.length ? fresh : pool;
      const cached = await cachedKeysFor(task);
      const known = candidates.filter((s) => cached.has(s.key));
      const unknown = candidates.filter((s) => !cached.has(s.key));
      const drawKnown = known.length >= LIBRARY_FLOOR && (!unknown.length || Math.random() > FRESH_DRAW_RATE);
      const from = drawKnown ? known : unknown.length ? unknown : known;
      sujet = from[Math.floor(Math.random() * from.length)];
    }

    /* ---- text: cache, or write it once ---- */
    let row = await readCached(sujet.key, task);
    let id = row?.id || null;
    let text = row?.text || "";
    let sentences = Array.isArray(row?.sentences) ? row.sentences : [];
    let level = row?.level || "C1";
    let words = row?.words || 0;

    if (!sentences.length) {
      const startedAt = Date.now();
      const made = await generateText(sujet);
      logAiUsage({ userId: user.id, endpoint: "dictee", kind: "chat", model: made.model || CHAT_MODEL_NAME, usage: made.usage, durationMs: Date.now() - startedAt });
      ({ text, sentences, level, words } = made);
      row = null; // nothing cached yet; the row is written below, with its audio
    }

    /* ---- audio: cache, or synthesize once ---- */
    let audio = Array.isArray(row?.audio) && row.audio.length === sentences.length ? row.audio : null;
    if (!audio) {
      const ttsStart = Date.now();
      const made = await synthesize(sentences);
      if (made) {
        audio = made.audio;
        // Neural TTS bills per character, so characters are what is metered.
        logAiUsage({ userId: user.id, endpoint: "dictee", kind: "tts", model: TTS_MODEL_NAME, usage: { total_tokens: made.chars }, audioBytes: made.bytes, durationMs: Date.now() - ttsStart });
      }
    }

    /* ---- persist, so the next candidate pays for none of the above ---- */
    if (!id) {
      id = await writeCached({
        sujet_key: sujet.key, task, level, prompt: sujet.prompt.slice(0, 4000),
        text, sentences, audio, words,
      });
    } else if (audio && !row?.audio) {
      await attachAudio(id, audio);
    }

    res.status(200).json({
      id,
      sujetKey: sujet.key,
      task,
      level,
      words,
      prompt: sujet.prompt,
      theme: sujet.theme || null,
      month: { year: sujet.year, monthNum: sujet.monthNum, n: sujet.n },
      sentences,
      // Index-aligned with `sentences`; a null entry means "no recording for
      // this one", and the client voices it with the browser's own speech.
      audio: audio || sentences.map(() => null),
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
