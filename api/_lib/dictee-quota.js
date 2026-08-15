import { HttpError } from "./groq.js";
import { bumpLimit, holdWindow } from "./ratelimit.js";
import { dailyDicteesFor, DICTEE_BURST, DICTEE_PAUSE_MINUTES } from "./auth.js";
import { today } from "./dictee.js";

// How many dictations one account may draw, per tâche. Two rules, and which one
// applies is decided by the plan_label baked into app_metadata at checkout —
// the maps live in api/_lib/auth.js next to the AI-simulation quotas, because a
// plan's entitlements belong in one place.
//
//   • A CAPPED plan (Starter, 3 per tâche per day) is a sold limit. It is
//     printed on the plan card in src/constants/pricing.js, the two numbers
//     must move together, and the refusal names the plan and says when it
//     resets.
//
//   • An UNCAPPED plan (Pro, Ultimate) is exactly that: no daily limit, and
//     nothing on the site says otherwise. What it gets is a PAUSE — five
//     dictations on the same tâche inside a quarter of an hour, and the next
//     one asks for a fifteen-minute break. That is not a quota being hidden:
//     drawing a sixth dictation of the same tâche in fifteen minutes means the
//     candidate is reloading texts rather than taking them down (a real dictée
//     runs five to fifteen minutes), and the message says as much.
//
// Both are counted in the shared rate_limits table rather than in a table of
// their own, so this needed no migration: the counter is atomic across
// serverless instances, and it degrades to a per-instance count if the
// rate-limits migration is ever missing — some metering rather than a broken
// dictée.
//
// WHAT COUNTS AS ONE USE: one dictation handed out by api/dictee.js. Listing
// the library is free, and so is everything the candidate does once they have
// the text — replays, the whole exercise, the report. Abandoning a dictation
// and drawing another one does count, which is the point: it is the draw that
// costs a text, and the burst rule exists precisely for the person who keeps
// drawing.
//
// This is claimed AFTER the handler knows it can actually serve the draw, so a
// request that dies on "les sujets inédits du jour sont épuisés" never costs
// one of a Starter's three.

const DAY_SECONDS = 24 * 60 * 60;

const TASK_NAME = { 1: "tâche 1", 2: "tâche 2", 3: "tâche 3" };

// The day is part of the KEY, not just the window length: a fixed 24-hour
// window would start at whatever time the candidate took their first dictée and
// roll at that same hour the next day, which is not what "3 par jour" means to
// anyone reading the card. Keying on the date makes the reset a real midnight
// (UTC, the same day boundary api/cron/dictee-seed.js writes its featured texts
// on, so "the day's dictées" means one thing across the feature). Yesterday's
// keys are swept by bump_rate_limit's own opportunistic cleanup.
const dailyKey = (userId, task) => `dictee-day|${today()}|t${task}|${userId}`;
const burstKey = (userId, task) => `dictee-burst|t${task}|${userId}`;

// Throws 429 when the caller may not draw this tâche right now; returns
// silently otherwise. `err.code` names which rule bit, so the browser can tell
// a friendly pause apart from a refusal and style it accordingly
// (src/hooks/useDictee.js).
export async function claimDicteeDraw(user, task) {
  const meta = user?.app_metadata || {};
  // Back-office roles are outside both rules — an admin checking that a tâche
  // still generates would otherwise lock themselves out for fifteen minutes.
  if (meta.role === "admin" || meta.role === "owner") return;

  const perDay = dailyDicteesFor(user);

  if (perDay != null) {
    const allowed = await bumpLimit({
      key: dailyKey(user.id, task),
      limit: perDay,
      windowSeconds: DAY_SECONDS,
    });
    if (!allowed) {
      const err = new HttpError(
        429,
        `Vous avez fait vos ${perDay} dictées du jour sur la ${TASK_NAME[task] || `tâche ${task}`}. Les deux autres tâches vous attendent, sinon la remise à zéro est à minuit — ou passez au forfait Pro pour des dictées sans limite.`,
      );
      err.code = "dictee-daily";
      throw err;
    }
    return;
  }

  // Uncapped plan: no daily count at all, just the anti-churn pause.
  const key = burstKey(user.id, task);
  const allowed = await bumpLimit({ key, limit: DICTEE_BURST, windowSeconds: DICTEE_PAUSE_MINUTES * 60 });
  if (!allowed) {
    // Restart the window here so the break really is fifteen minutes from the
    // moment they were stopped, which is what the message promises.
    await holdWindow({ key, limit: DICTEE_BURST });
    const err = new HttpError(
      429,
      `Vous avez travaillé dur : ${DICTEE_BURST} dictées sur cette tâche. Continuez comme ça ! Mais pour que ça porte vraiment, faites une pause de ${DICTEE_PAUSE_MINUTES} minutes et revenez.`,
    );
    err.code = "dictee-pause";
    throw err;
  }
}
