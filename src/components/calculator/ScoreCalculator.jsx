import { useState } from "react";
import { Calculator as CalcIcon, ArrowRight, CheckCircle2, AlertTriangle, Headphones, BookOpen, Pencil, Mic, Rocket, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn, Pill, ProgressBar } from "@/components/common";
import { CALC_PROFILES, SCORE_RANGE, SECTION_LABELS, nclcFor } from "@/utils/nclc";

// Display order and per-skill icons — mirrors the paper score report
// (Compréhension orale/écrite, then Expression écrite/orale).
const ORDER = ["co", "ce", "ee", "eo"];
const ICONS = { co: Headphones, ce: BookOpen, ee: Pencil, eo: Mic };

// Filled brand gradient up to `pct`, neutral track after — works in both themes.
const sliderBg = (pct) => ({
  background: `linear-gradient(90deg,#2E6BE6,#6C4FE0,#D8354A) 0 0 / ${pct}% 100% no-repeat, rgba(148,163,184,.28)`,
});

// TCF Canada score → NCLC calculator with a live immigration-eligibility read.
// Self-contained (own state) so it sits on both the landing page and the
// /calculator route. Scores can be set with the slider OR typed directly; the
// profile panel on the right updates instantly — no "calculate" step.
export function ScoreCalculator() {
  const { c, nav, t } = useApp();
  const [scores, setScores] = useState({ co: "480", ce: "445", ee: "10", eo: "10" });

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

  const gaugeColor = allMet ? "#10B981" : "#F59E0B"; // emerald when fully eligible, else amber
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const gaugeFrac = Math.max(0, Math.min(1, minNclc / 10));

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* ── Left: inputs ─────────────────────────────────────────────── */}
      <Card className="p-6 md:p-7">
        <div className="text-center mb-6">
          <span className="w-12 h-12 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-600/25" style={{ background: "linear-gradient(90deg,#2E6BE6,#D8354A)" }}><CalcIcon size={22} /></span>
          <h3 className={`font-display font-bold text-lg mt-3 ${c.text}`}>{t("Entrez vos scores TCF Canada")}</h3>
          <p className={`text-sm mt-1 ${c.sub}`}>{t("Déplacez les curseurs ou saisissez vos scores dans chaque compétence")}</p>
        </div>

        <div className={`border-t ${c.border} pt-5 space-y-4`}>
          {ORDER.map((s) => {
            const Icon = ICONS[s];
            const { min, max } = SCORE_RANGE[s];
            const val = scores[s];
            const num = val === "" ? min : Number(val);
            const pct = ((num - min) / (max - min)) * 100;
            const nclc = nclcFor(s, val);
            return (
              <div key={s} className={`p-4 rounded-2xl border ${c.border} ${c.bg}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                    <span className={`text-sm font-semibold truncate ${c.text}`}>{t(SECTION_LABELS[s])}</span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => setScore(s, e.target.value)}
                      aria-label={`${t(SECTION_LABELS[s])} — ${t("score")}`}
                      className="w-16 text-right bg-transparent outline-none font-display font-extrabold text-2xl grad-text"
                      style={{ caretColor: "#2E6BE6" }}
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
                  style={sliderBg(pct)}
                />
                <div className="flex justify-end mt-2">
                  <Pill tone="green">NCLC {nclc == null ? "—" : nclc === 0 ? "< 4" : nclc}</Pill>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Right: profile ───────────────────────────────────────────── */}
      <Card className="p-6 md:p-7">
        <div className="text-center mb-5">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-600/25" style={{ background: "linear-gradient(90deg,#2E6BE6,#D8354A)" }}>
            <svg viewBox="0 0 512 512" className="w-6 h-6" fill="#fff" role="img" aria-label="Canada">
              <path d="M383.8 351.7c2.5-2.5 105.2-92.4 105.2-92.4l-17.5-7.5c-10-4.9-7.4-11.5-5-17.4 2.4-7.6 20-67.3 20-67.3s-47.4 10-57.4 12.5c-7.5 2.4-10-2.6-12.5-7.6l-15-32.4-52.4 57.3c-7.6 5-15 0-12.5-7.5l25-129.7-39.9 22.5c-7.5 5-12.5 5-17.5-5L256 32l-51.7 96.6c-5 10-10 10-17.5 5l-39.9-22.5 24.9 129.7c2.6 7.5-4.9 12.5-12.4 7.5l-52.4-57.3-15 32.4c-2.5 5-5 10-12.5 7.6-10-2.5-57.4-12.5-57.4-12.5s17.6 59.7 20 67.3c2.5 7.5 5 12.5-5 17.4l-17.5 7.5s102.6 89.9 105.2 92.4c5 5 10 7.5 5 22.4-5 15-10 32.5-10 32.5s95-20 105-22.5c8.4-1.7 12.9 2.5 12.4 7.5L245 480h22l-7.5-102.4c-.5-5 4-9.2 12.5-7.5 10 2.5 105 22.5 105 22.5s-5-17.5-10-32.5 0-17.4 5-22.4z" />
            </svg>
          </span>
          <h3 className={`font-display font-bold text-lg mt-3 ${c.text}`}>{t("Votre profil linguistique")}</h3>
          <p className={`text-xs font-semibold mt-0.5 ${c.faint}`}>{t("Équivalence IRCC officielle")}</p>
        </div>

        {/* min-NCLC gauge */}
        <div className="flex justify-center mb-5">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(148,163,184,.25)" strokeWidth="9" />
              <circle cx="50" cy="50" r={R} fill="none" stroke={gaugeColor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - gaugeFrac)} style={{ transition: "stroke-dashoffset .4s ease, stroke .3s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${c.faint}`}>{t("Niveau min.")}</span>
              <span className={`font-display font-extrabold text-3xl leading-none ${c.text}`}>{minNclc}</span>
              <span className={`text-[10px] font-bold ${c.faint}`}>NCLC</span>
            </div>
          </div>
        </div>

        {/* lowest-skill note */}
        <div className={`p-3 rounded-2xl ${c.tint} flex items-start gap-2.5 mb-5`}>
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className={`text-xs leading-relaxed ${c.sub}`}>{t("Votre niveau le plus bas détermine votre éligibilité aux programmes d'immigration")}</p>
        </div>

        {/* per-skill bars */}
        <div className={`rounded-2xl border ${c.border} p-4 space-y-3 mb-5`}>
          {ORDER.map((s) => {
            const Icon = ICONS[s];
            const nclc = nclcOf(s);
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={14} /></span>
                <div className="flex-1 min-w-0"><ProgressBar pct={nclc * 10} tone="grad" /></div>
                <span className={`text-sm font-bold font-mono2 w-4 text-right ${c.text}`}>{nclc}</span>
              </div>
            );
          })}
        </div>

        {/* eligibility */}
        {allMet ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 flex items-start gap-2.5 mb-4">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-600">{t("Éligible")}</p>
              <p className={`text-xs ${c.sub}`}>{t("Vos 4 épreuves atteignent le seuil NCLC 7.")}</p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 flex items-start gap-2.5 mb-4">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-600">{t("Partiellement éligible")}</p>
              <p className={`text-xs ${c.sub}`}>{t("NCLC 7+ recommandé pour maximiser vos points CRS")}</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className={`rounded-2xl border ${c.border} p-5`}>
          <div className="flex items-center gap-2 mb-1">
            <Rocket size={18} className="text-blue-600 shrink-0" />
            <p className={`font-display font-bold ${c.text}`}>{t("Atteignez le niveau CLB 9+ !")}</p>
          </div>
          <p className={`text-sm mb-4 ${c.sub}`}>{t("Entraînez-vous avec nos simulations réalistes")}</p>
          <Btn variant="accent" className="w-full" icon={ArrowRight} onClick={() => nav("practice")}>{t("Commencer à pratiquer gratuitement")}</Btn>
        </div>
      </Card>

      <p className={`lg:col-span-2 text-[11px] leading-relaxed ${c.faint}`}>{t("Conversion basée sur la grille d'équivalence TCF Canada → NCLC d'IRCC. Résultat indicatif : vérifiez toujours les seuils officiels de votre programme (IRCC, MIFI).")}</p>
    </div>
  );
}
