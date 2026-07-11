import { SECTION_LABELS } from "@/utils/bankAdapter";

// Official IRCC conversion — TCF Canada scores → NCLC (Niveaux de compétence
// linguistique canadiens, the French CLB). Compréhension orale/écrite are
// scored /699; expression orale/écrite are scored /20. Ranges are inclusive.
// Source: IRCC "Language testing — TCF Canada" equivalency chart.
const BANDS = {
  co: [[549, 699, 10], [523, 548, 9], [503, 522, 8], [458, 502, 7], [398, 457, 6], [369, 397, 5], [331, 368, 4]],
  ce: [[549, 699, 10], [524, 548, 9], [499, 523, 8], [453, 498, 7], [406, 452, 6], [375, 405, 5], [342, 374, 4]],
  eo: [[16, 20, 10], [14, 15, 9], [12, 13, 8], [10, 11, 7], [7, 9, 6], [6, 6, 5], [4, 5, 4]],
  ee: [[16, 20, 10], [14, 15, 9], [12, 13, 8], [10, 11, 7], [7, 9, 6], [6, 6, 5], [4, 5, 4]],
};

// Indicative CECRL (CEFR) equivalence per NCLC level — for orientation only.
const CECRL = { 4: "A2", 5: "B1", 6: "B1", 7: "B2", 8: "B2", 9: "C1", 10: "C2" };

export { SECTION_LABELS };
export const CALC_SECTIONS = ["co", "ce", "eo", "ee"];

export const SCORE_RANGE = {
  co: { min: 0, max: 699, hint: "101 – 699" },
  ce: { min: 0, max: 699, hint: "101 – 699" },
  eo: { min: 0, max: 20, hint: "1 – 20" },
  ee: { min: 0, max: 20, hint: "1 – 20" },
};

// NCLC level for a raw score: a number 4–10, 0 when below NCLC 4, or null when
// the field is empty / not a number.
export function nclcFor(section, score) {
  if (score === "" || score == null) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  for (const [lo, hi, lvl] of BANDS[section]) if (n >= lo && n <= hi) return lvl;
  return 0;
}

export function cecrlFor(nclc) {
  return CECRL[nclc] || "—";
}

// Immigration targets, each with a minimum NCLC required per skill. Thresholds
// are indicative — programs and cut-offs change; always confirm with IRCC / MIFI.
export const CALC_PROFILES = [
  { id: "ee", label: "Entrée express — fédéral", desc: "Les 4 épreuves ≥ NCLC 7", min: { co: 7, ce: 7, eo: 7, ee: 7 } },
  { id: "pstq", label: "Québec — PSTQ (qualifié)", desc: "Oral ≥ NCLC 7 · Écrit ≥ NCLC 5", min: { co: 7, ce: 5, eo: 7, ee: 5 } },
  { id: "rp", label: "Objectif NCLC 5", desc: "Les 4 épreuves ≥ NCLC 5", min: { co: 5, ce: 5, eo: 5, ee: 5 } },
];
