// Pure helpers for the Expression écrite model answers: no imports, no I/O, so
// they can be unit-tested directly (tests/ runs plain node, with no bundler to
// resolve the "@/" alias). The data access lives in sujetsAnswersService.js,
// which re-exports these.

export const ANSWER_TACHES = [1, 2, 3];

// The flag the admin writes onto a combinaison once its answers exist, which is
// what lights up the public « Voir un modèle de réponse » link. A single
// character because it rides inside the archive payload every visitor
// downloads; the answers themselves are in their own Premium-gated table.
export const hasAnswer = (s) => s?.a === true;

// Marks the combinaisons whose answers were just generated, for the admin to
// save back into sujets_archive. Returns a new array; the input is untouched.
export function markAnswered(data, numbers) {
  const done = new Set(numbers);
  return (data || []).map((s, i) => (done.has(s.n ?? i + 1) ? { ...s, a: true } : s));
}

// Splits a body into plain/strong segments on the stored expressions, so the
// page can highlight what is worth memorising without storing any markup in the
// text itself.
//
// Longest term first: « en dépit de » has to win over « de », or the shorter
// match would cut the longer one in half. Comparison is case-insensitive but
// the ORIGINAL casing is what gets emitted, so a phrase highlighted at the
// start of a sentence keeps its capital.
export function highlight(body, keywords) {
  const text = String(body || "");
  if (!text) return [];
  const terms = [...new Set((keywords || []).map((k) => String(k || "").trim()).filter((k) => k.length >= 3))]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.toLowerCase());
  if (!terms.length) return [{ text, strong: false }];

  const lower = text.toLowerCase();
  const out = [];
  let plain = "";
  let i = 0;
  while (i < text.length) {
    const hit = terms.find((t) => lower.startsWith(t, i));
    if (hit) {
      if (plain) { out.push({ text: plain, strong: false }); plain = ""; }
      out.push({ text: text.slice(i, i + hit.length), strong: true });
      i += hit.length;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) out.push({ text: plain, strong: false });
  return out;
}
