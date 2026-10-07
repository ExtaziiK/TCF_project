import { SECTION_LABELS } from "@/utils/bankAdapter";
import { nclcFor } from "../../api/_lib/scoreBands.js";

export { nclcFor };

// NCLC bands and nclcFor live in api/_lib/scoreBands.js, shared with the
// server (the TCF blanc results email). Re-exported unchanged below.

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
