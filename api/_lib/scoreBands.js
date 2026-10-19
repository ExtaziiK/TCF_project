// Score conversions shared by the site and the server: the NCLC bands of the
// calculator (src/utils/nclc.js) and the CEFR level the TCF blanc report shows
// (src/services/examService.js). One copy, so the "Vos résultats du TCF blanc"
// email (api/_lib/mockResults.js) can never disagree with the screen.
// Pure: no browser or Node APIs.

// Official IRCC conversion — TCF Canada scores → NCLC (Niveaux de compétence
// linguistique canadiens, the French CLB). Compréhension orale/écrite are
// scored /699; expression orale/écrite are scored /20. Ranges are inclusive.
// Source: IRCC "Language testing — TCF Canada" equivalency chart.
export const NCLC_BANDS = {
  co: [[549, 699, 10], [523, 548, 9], [503, 522, 8], [458, 502, 7], [398, 457, 6], [369, 397, 5], [331, 368, 4]],
  ce: [[549, 699, 10], [524, 548, 9], [499, 523, 8], [453, 498, 7], [406, 452, 6], [375, 405, 5], [342, 374, 4]],
  eo: [[16, 20, 10], [14, 15, 9], [12, 13, 8], [10, 11, 7], [7, 9, 6], [6, 6, 5], [4, 5, 4]],
  ee: [[16, 20, 10], [14, 15, 9], [12, 13, 8], [10, 11, 7], [7, 9, 6], [6, 6, 5], [4, 5, 4]],
};

// NCLC level for a raw score: a number 4–10, 0 when below NCLC 4, or null when
// the field is empty / not a number.
export function nclcFor(section, score) {
  if (score === "" || score == null) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  for (const [lo, hi, lvl] of NCLC_BANDS[section]) if (n >= lo && n <= hi) return lvl;
  return 0;
}

// Lowest score that reaches NCLC `level` (4–10) in a section, or null.
export function minScoreFor(section, level) {
  const band = (NCLC_BANDS[section] || []).find(([, , lvl]) => lvl === level);
  return band ? band[0] : null;
}

// Points still missing to reach NCLC `level`: 0 when already there, null when
// the score is empty / not a number or the level has no band. The calculator
// shows it as « +8 pts → NCLC 7 ».
export function pointsToNclc(section, score, level) {
  if (score === "" || score == null) return null;
  const n = Number(score);
  const floor = minScoreFor(section, level);
  if (!Number.isFinite(n) || floor == null) return null;
  return Math.max(0, floor - n);
}

// The level the TCF blanc report prints for a percentage of correct answers.
export function levelForPct(pct) {
  return pct >= 85 ? "C1" : pct >= 65 ? "B2" : pct >= 40 ? "B1" : "A2";
}
