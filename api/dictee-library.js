import { requireUser } from "./_lib/auth.js";
import { HttpError } from "./_lib/groq.js";
import { listSujets, listLibrary, generatedToday, today, DAILY_TOTAL } from "./_lib/dictee.js";

// What a candidate can start right now, and what it would cost.
//
// Two lists, and the difference between them is only how they got there:
//   • `today`   — the three the cron wrote last night, one per tâche
//   • `library` — every text written on any previous day
// Both are already paid for. Starting either is a single read, which is why the
// intro can offer them together without the picker having to warn about
// anything.
//
// `budget.remaining` is the third thing the page needs: how many sujets nobody
// has ever dictated can still be opened today. When it reaches zero the "sujet
// inédit" button turns itself off and says why, instead of letting someone
// click into a 409.
//
// Labels are resolved HERE rather than in the browser. The client's own copy of
// the archive only reaches back two months (dicteeService → RECENT_MONTHS), and
// the library keeps texts for ever — within a few months most of it would be
// keys the browser could not put a name to.

const LIBRARY_LIMIT = 80;

// Tâche 3 is a themed dossier rather than a one-line instruction, so its theme
// is what gets shown; the two documents would swamp a list.
const labelOf = (sujet) => (sujet.theme ? sujet.theme : sujet.prompt).replace(/\s+/g, " ").trim().slice(0, 240);

export default async function handler(req, res) {
  try {
    // POST for a read: it keeps this on the same authenticated client helper as
    // every other endpoint (src/services/aiService.js → postJSON), which is
    // where token refresh and the device-session header are handled.
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    await requireUser(req);

    const [sujets, rows, used] = await Promise.all([listSujets(req), listLibrary(LIBRARY_LIMIT), generatedToday()]);

    // (sujetKey, tâche) → the archive entry, so a cached row can be given its
    // prompt, its month and its theme.
    const byKey = new Map(sujets.map((s) => [`${s.key}:${s.task}`, s]));
    const day = today();

    const entry = (row) => {
      const sujet = byKey.get(`${row.sujet_key}:${row.task}`);
      // A cached row whose sujet has since been edited out of the archive by an
      // admin. It cannot be labelled or started, so it is not offered.
      if (!sujet) return null;
      return {
        sujetKey: row.sujet_key,
        task: row.task,
        level: row.level,
        words: row.words,
        label: labelOf(sujet),
        theme: Boolean(sujet.theme),
        year: sujet.year,
        monthNum: sujet.monthNum,
        n: sujet.n,
        featured: row.featured_on === day,
      };
    };

    // Carried on the entry rather than read back off `rows` by index: the
    // filter above drops unlabelable rows, so the two arrays stop lining up.
    const all = rows.map(entry).filter(Boolean);

    res.status(200).json({
      day,
      today: all.filter((e) => e.featured),
      library: all.filter((e) => !e.featured),
      budget: { used, total: DAILY_TOTAL, remaining: Math.max(0, DAILY_TOTAL - used) },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "La bibliothèque n'a pas pu être chargée." });
  }
}
