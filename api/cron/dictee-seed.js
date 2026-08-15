import { CHAT_MODEL_NAME } from "../_lib/groq.js";
import { TTS_MODEL_NAME } from "../_lib/tts.js";
import { logAiUsage } from "../_lib/usage.js";
import { listSujets, cachedKeysFor, mintDictee, generatedToday, today, DAILY_SEED } from "../_lib/dictee.js";

// La dictée du jour — the nightly seeder (see vercel.json → crons).
//
// Writes DAILY_SEED new texts a night, one per tâche, and stamps them
// `featured_on = today` so the intro can show them as the day's three. Every
// text it has ever written stays in the library for ever, so what a candidate
// can practise on grows by three a day and never shrinks: a month in, ninety
// dictées; a year in, most of the archive.
//
// WHY A CRON AND NOT A DRAW. Generation used to happen when someone drew an
// uncached sujet, which meant one unlucky candidate per text paid ten seconds
// of Groq and Azure while a spinner told them their corrigé was being written.
// Moving it here at 07:00 UTC — around three in the morning in Canada — means
// the texts are waiting before anyone opens the page, and no candidate ever
// waits for a generation again.
//
// Security: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env
// var is set. We reject anything else so the endpoint can't be triggered by the
// public. Set CRON_SECRET in the Vercel project (and .env.local for local runs).

// A serverless function is capped at 60 s (vercel.json). One text costs a Groq
// call plus a dozen-odd Azure requests — call it fifteen seconds — so three fit,
// but not with room to spare. We stop starting new ones past this mark and let
// tomorrow's run catch up: a partial seed leaves the library bigger than it
// was, while a timeout leaves a half-written row and no report of what happened.
const BUDGET_MS = 45_000;

// Where the night's sujets are drawn from. Newest first, because a candidate
// practising for next month's épreuve is better served by last month's sujet
// than by one from three years ago; the window is wide enough that the same
// handful don't come up night after night.
const RECENT_WINDOW = 20;

const pickSujet = (pool, cached) => {
  const uncached = pool.filter((s) => !cached.has(s.key));
  if (!uncached.length) return null;
  uncached.sort((a, b) => b.year - a.year || b.monthNum - a.monthNum || a.n - b.n);
  const window = uncached.slice(0, RECENT_WINDOW);
  return window[Math.floor(Math.random() * window.length)];
};

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startedAt = Date.now();
  const summary = { day: today(), seeded: [], skipped: [], errors: [] };

  try {
    // A re-trigger on the same day must not seed a second set. The count is of
    // rows written today by anyone — cron or on-demand — so a day that already
    // spent its slots on candidates' fresh draws seeds proportionally fewer.
    const already = await generatedToday();
    const room = Math.max(0, DAILY_SEED - already);
    if (!room) {
      summary.skipped.push(`déjà ${already} texte(s) écrit(s) aujourd'hui`);
      return res.status(200).json({ ok: true, summary });
    }

    const all = await listSujets(req);
    // One per tâche, in order, so a day that only has room for one still adds
    // variety across the week rather than always topping up tâche 1.
    const tasks = [1, 2, 3].slice(0, room);

    for (const task of tasks) {
      if (Date.now() - startedAt > BUDGET_MS) {
        summary.skipped.push(`tâche ${task} : temps de fonction épuisé`);
        continue;
      }
      try {
        const cached = await cachedKeysFor(task);
        const sujet = pickSujet(all.filter((s) => s.task === task), cached);
        if (!sujet) {
          summary.skipped.push(`tâche ${task} : tous les sujets sont déjà dans la bibliothèque`);
          continue;
        }

        const minted = await mintDictee(sujet, { featuredOn: today() });
        logAiUsage({
          userId: null, endpoint: "dictee-seed", kind: "chat",
          model: minted.chat.model || CHAT_MODEL_NAME, usage: minted.chat.usage, durationMs: minted.chat.ms,
        });
        if (minted.tts) {
          logAiUsage({
            userId: null, endpoint: "dictee-seed", kind: "tts", model: TTS_MODEL_NAME,
            usage: { total_tokens: minted.tts.chars }, audioBytes: minted.tts.bytes, durationMs: minted.tts.ms,
          });
        }
        summary.seeded.push({
          task,
          sujetKey: sujet.key,
          groups: minted.row.groups.length,
          words: minted.row.words,
          // A text with no recordings is still a dictée — the browser reads it
          // with its own voice — but it is worth seeing in the cron's report,
          // because it means Azure was unreachable at three in the morning.
          audio: minted.tts ? "ok" : "aucune (Azure indisponible)",
        });
      } catch (err) {
        // One tâche failing is not a reason to skip the other two.
        summary.errors.push(`tâche ${task} : ${err.message}`);
        console.error(`dictee-seed: tâche ${task}:`, err.message);
      }
    }
  } catch (err) {
    console.error("dictee-seed: fatal:", err.message);
    return res.status(500).json({ error: err.message, summary });
  }

  return res.status(200).json({ ok: true, summary });
}
