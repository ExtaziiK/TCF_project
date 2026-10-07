import { levelForPct, nclcFor } from "./scoreBands.js";

// What the "Vos résultats du TCF blanc" email says, from the score saved on the
// attempt (examService.scoreExam): { ok, total, pct, points, level, perTask }.
// Same numbers as the report screen (src/pages/Mocks.jsx ExamReport): the
// overall /699 and level, per section the correct answers and level. Added
// here: an NCLC estimate for CO/CE (the section's share scaled to /699, run
// through the calculator's IRCC bands) and the weakest of those sections.
// EE/EO are self-assessed in the TCF blanc, so they get no score.
// Pure — shared by the sender and the admin preview.

export const SECTION_NAMES = {
  co: "Compréhension orale",
  ce: "Compréhension écrite",
  eo: "Expression orale",
  ee: "Expression écrite",
};

export function summarizeScore(score) {
  const s = score || {};
  const sections = (s.perTask || []).map((task) => {
    const selfAssessed = !!(task.type && task.type !== "quiz");
    const pct = task.total ? Math.round((task.ok / task.total) * 100) : 0;
    const points = Math.round((pct / 100) * 699);
    return {
      key: task.section,
      name: SECTION_NAMES[task.section] || String(task.section || ""),
      selfAssessed,
      ok: task.ok || 0,
      total: task.total || 0,
      pct,
      level: selfAssessed ? null : levelForPct(pct),
      nclc: selfAssessed || !["co", "ce"].includes(task.section) ? null : nclcFor(task.section, points),
    };
  });
  const scored = sections.filter((x) => !x.selfAssessed && x.total > 0);
  const weakest = scored.length ? scored.reduce((lo, x) => (x.pct < lo.pct ? x : lo)) : null;
  return { points: s.points ?? 0, level: s.level || levelForPct(s.pct || 0), pct: s.pct ?? 0, sections, weakest };
}

// How to practise on TCF Passerelle, starting with the weakest section. Every
// tool named here exists on the site; Premium ones say so. Plain text with
// **bold**, one "• " line each — the {conseils} placeholder of the email.
const COMMON_TIPS = [
  "• Chaque jour, quelques minutes de **cartes de vocabulaire** et de **grammaire** (en accès libre) pour consolider vos bases",
  "• Préparez l'**expression écrite et orale** avec les **sujets du mois** et la correction par IA",
  "• Repassez un **TCF blanc** dans quelques semaines pour mesurer vos progrès (avec un forfait)",
];
const SECTION_TIPS = {
  co: [
    "• Refaites les quiz de **compréhension orale** dans Épreuves, puis ouvrez « Revoir mes réponses » pour réécouter chaque question manquée",
    "• **La dictée** : 10 minutes par jour pour habituer votre oreille au français parlé rapidement (Premium)",
    "• En dehors du site, 15 minutes de radio ou de podcast en français chaque jour",
  ],
  ce: [
    "• Refaites les quiz de **compréhension écrite** en vous chronométrant, comme le jour J",
    "• **Révision** : les questions les plus difficiles avec leur corrigé, pour comprendre chaque piège (Premium)",
    "• Lisez un article de presse par jour et ajoutez les mots nouveaux à vos révisions de vocabulaire",
  ],
};
export function practiceTips(weakestKey) {
  return [...(SECTION_TIPS[weakestKey] || []), ...COMMON_TIPS].join("\n");
}

// The sample the admin preview and test send use.
export const SAMPLE_SCORE = {
  ok: 54, total: 78, pct: 69, points: 482, level: "B2",
  perTask: [
    { section: "co", type: "quiz", ok: 25, total: 39 },
    { section: "ce", type: "quiz", ok: 29, total: 39 },
    { section: "ee", type: "writing", ok: 0, total: 0 },
    { section: "eo", type: "speaking", ok: 0, total: 0 },
  ],
};
