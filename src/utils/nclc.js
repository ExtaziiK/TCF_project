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

// CECRL (CEFR) comes straight from the TCF score, NOT from the NCLC level:
// the two use different score bands, so e.g. a Compréhension score of 400 is
// CEFR B2 even though it's only NCLC 6. Receptive skills use the 100-point
// bands printed on the TCF score report; productive skills use the /20 bands.
const CEFR_BANDS = {
  co: [[600, 699, "C2"], [500, 599, "C1"], [400, 499, "B2"], [300, 399, "B1"], [200, 299, "A2"], [100, 199, "A1"]],
  ce: [[600, 699, "C2"], [500, 599, "C1"], [400, 499, "B2"], [300, 399, "B1"], [200, 299, "A2"], [100, 199, "A1"]],
  eo: [[16, 20, "C2"], [14, 15, "C1"], [10, 13, "B2"], [6, 9, "B1"], [4, 5, "A2"]],
  ee: [[16, 20, "C2"], [14, 15, "C1"], [10, 13, "B2"], [6, 9, "B1"], [4, 5, "A2"]],
};

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

// CEFR level for a raw score, or "—" when empty / below the lowest band.
export function cecrlFor(section, score) {
  if (score === "" || score == null) return "—";
  const n = Number(score);
  if (!Number.isFinite(n)) return "—";
  for (const [lo, hi, lvl] of CEFR_BANDS[section]) if (n >= lo && n <= hi) return lvl;
  return "—";
}

// Immigration target: minimum NCLC required per skill. Thresholds are
// indicative — programs and cut-offs change; always confirm with IRCC / MIFI.
export const CALC_PROFILES = [
  { id: "ee", label: "Entrée express — fédéral", desc: "Les 4 épreuves ≥ NCLC 7", min: { co: 7, ce: 7, eo: 7, ee: 7 } },
];
