import { useState } from "react";
import { ArrowRight, Headphones, BookOpen, Pencil, Mic, Info, Stamp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { CALC_PROFILES, SCORE_RANGE, SECTION_LABELS, nclcFor } from "@/utils/nclc";

// Display order and per-skill icons — mirrors the paper score report
// (Compréhension orale/écrite, then Expression écrite/orale).
const ORDER = ["co", "ce", "ee", "eo"];
const ICONS = { co: Headphones, ce: BookOpen, ee: Pencil, eo: Mic };
// Kept within the logo's palette (blue → violet → red): one accent per épreuve,
// on neutral tiles, so the calculator stays sober.
const ACCENT = { co: "#2E6BE6", ce: "#6C4FE0", ee: "#D8354A", eo: "#4F5CE3" };

// TCF Canada score → NCLC calculator with a live immigration-eligibility read.
// Self-contained (own state) so it sits on both the landing page and the
// /calculator route. Scores can be set with the slider OR typed directly; the
// « passeport linguistique » on the right updates instantly — no "calculate"
// step. Eligibility reads as a passport stamp: green when all four reach the
// threshold, red otherwise.
export function ScoreCalculator() {
  const { c, nav, t } = useApp();
  const [scores, setScores] = useState({ co: "480", ce: "445", ee: "10", eo: "10" });
  // One accent per épreuve, with light tints derived from it.
  const tone = (s) => {
    const a = ACCENT[s];
    return { fill: a, ink: a, soft: `${a}26`, pale: `${a}12` };
  };

  const profile = CALC_PROFILES[0]; // Entrée express fédéral — les 4 épreuves ≥ NCLC 7

  // Clamp to the skill's range whether the value arrives from the slider or is
  // typed: the HTML `max` only validates, it doesn't stop someone typing 999.
  const setScore = (s, v) => {
    let next = v;
    if (v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) return; // ignore non-numeric keystrokes
      const { min, max } = SCORE_RANGE[s];
      next = String(Math.min(max, Math.max(min, n)));
    }
    setScores((prev) => ({ ...prev, [s]: next }));
  };

  const nclcOf = (s) => nclcFor(s, scores[s]) || 0; // treat empty as 0 for the visuals
  const minNclc = Math.min(...ORDER.map(nclcOf));
  const allMet = ORDER.every((s) => nclcOf(s) >= profile.min[s]);

  const stamp = allMet ? "#059669" : "#D8354A"; // green when fully eligible, logo red otherwise
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const gaugeFrac = Math.max(0, Math.min(1, minNclc / 10));

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* ── Left: the four scores, one tile per épreuve in its colour ──── */}
      <Card className="p-5 md:p-6">
        <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Entrez vos scores TCF Canada")}</h3>
        <p className={`text-sm mt-1 mb-5 ${c.sub}`}>{t("Déplacez les curseurs ou saisissez vos scores dans chaque compétence")}</p>

        <div className="space-y-3">
          {ORDER.map((s) => {
            const Icon = ICONS[s];
            const k = tone(s);
            const { min, max } = SCORE_RANGE[s];
            const val = scores[s];
            const num = val === "" ? min : Number(val);
            const pct = ((num - min) / (max - min)) * 100;
            const nclc = nclcFor(s, val);
            return (
              <div key={s} className={`p-4 rounded-2xl border ${c.border} ${c.bg}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0" style={{ background: k.fill }}><Icon size={17} /></span>
                    <span className={`text-sm font-bold truncate ${c.text}`}>{t(SECTION_LABELS[s])}</span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => setScore(s, e.target.value)}
                      aria-label={`${t(SECTION_LABELS[s])} — ${t("score")}`}
                      className="w-16 text-right bg-transparent outline-none font-display font-extrabold text-2xl"
                      style={{ color: k.ink, caretColor: k.ink }}
                    />
                    <span className={`text-xs font-mono2 ${c.faint}`}>/ {max}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={num}
                  onChange={(e) => setScore(s, e.target.value)}
                  aria-label={`${t(SECTION_LABELS[s])} — ${t("curseur de score")}`}
                  className="range-brand w-full"
                  style={{ background: `linear-gradient(${k.fill},${k.fill}) 0 0 / ${pct}% 100% no-repeat, ${k.soft}` }}
                />
                <div className="flex justify-end mt-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border" style={{ color: k.ink, borderColor: `${k.ink}66` }}>
                    NCLC {nclc == null ? "—" : nclc === 0 ? "< 4" : nclc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Right: the « passeport linguistique » ───────────────────────── */}
      <Card className="p-5 md:p-6 relative overflow-hidden">
        <div className="text-center">
          <p className="font-mono2 text-[11px] font-bold uppercase tracking-widest text-blue-600">{t("Passeport linguistique")}</p>
          <h3 className={`font-display font-bold text-lg mt-1 ${c.text}`}>{t("Votre profil linguistique")}</h3>
          <p className={`text-xs font-semibold mt-0.5 ${c.faint}`}>{t("Équivalence IRCC officielle")}</p>
        </div>
        {/* min-NCLC gauge, under the heading */}
        <div className="mt-4 flex justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(148,163,184,.25)" strokeWidth="9" />
              <circle cx="50" cy="50" r={R} fill="none" stroke={stamp} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - gaugeFrac)} style={{ transition: "stroke-dashoffset .4s ease, stroke .3s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[8px] font-bold uppercase tracking-widest ${c.faint}`}>{t("Niveau min.")}</span>
              <span className={`font-display font-extrabold text-3xl leading-none ${c.text}`}>{minNclc}</span>
              <span className={`text-[9px] font-bold ${c.faint}`}>NCLC</span>
            </div>
          </div>
        </div>

        {/* per-skill bars, each in its épreuve's accent */}
        <div className="mt-5 space-y-2.5">
          {ORDER.map((s) => {
            const Icon = ICONS[s];
            const k = tone(s);
            const nclc = nclcOf(s);
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: k.pale, color: k.ink }}><Icon size={15} /></span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: k.soft }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${nclc * 10}%`, background: k.fill }} />
                </div>
                <span className={`text-sm font-bold font-mono2 w-5 text-right ${c.text}`}>{nclc}</span>
              </div>
            );
          })}
        </div>

        {/* eligibility, as a passport stamp */}
        <div className="mt-6 flex items-center gap-5">
          <div className="shrink-0 -rotate-12 w-28 h-28 rounded-full border-[3px] border-dashed grid place-items-center text-center"
            style={{ borderColor: stamp, color: stamp }} role="img" aria-label={t(allMet ? "Éligible" : "Partiellement éligible")}>
            <div>
              <Stamp size={18} className="mx-auto" />
              <p className="font-display font-extrabold text-sm leading-tight mt-1 uppercase">{t(allMet ? "Éligible" : "À renforcer")}</p>
              <p className="font-mono2 text-[10px] font-bold mt-0.5">NCLC 7</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: stamp }}>{t(allMet ? "Éligible" : "Partiellement éligible")}</p>
            <p className={`text-xs mt-1 ${c.sub}`}>{t(allMet ? "Vos 4 épreuves atteignent le seuil NCLC 7." : "NCLC 7+ recommandé pour maximiser vos points CRS")}</p>
            <p className={`text-xs mt-2 flex items-start gap-1.5 ${c.faint}`}>
              <Info size={13} className="shrink-0 mt-0.5" />
              {t("Votre niveau le plus bas détermine votre éligibilité aux programmes d'immigration")}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className={`mt-6 pt-5 border-t ${c.border}`}>
          <p className={`font-display font-bold ${c.text}`}>{t("Atteignez le niveau CLB 9+ !")}</p>
          <p className={`text-sm mt-0.5 mb-4 ${c.sub}`}>{t("Entraînez-vous avec nos simulations réalistes")}</p>
          <Btn variant="accent" className="w-full" icon={ArrowRight} onClick={() => nav("mocks")}>{t("Testez votre niveau gratuitement")}</Btn>
        </div>
      </Card>

      <p className={`lg:col-span-2 text-[11px] leading-relaxed ${c.faint}`}>{t("Conversion basée sur la grille d'équivalence TCF Canada → NCLC d'IRCC. Résultat indicatif : vérifiez toujours les seuils officiels de votre programme (IRCC, MIFI).")}</p>
    </div>
  );
}
