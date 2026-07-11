import { useState } from "react";
import { Calculator as CalcIcon, ArrowRight, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { CALC_PROFILES, CALC_SECTIONS, SCORE_RANGE, SECTION_LABELS, nclcFor, cecrlFor } from "@/utils/nclc";

const SHORT = { co: "CO", ce: "CE", eo: "EO", ee: "EE" };

// TCF Canada score → NCLC / CECRL calculator with an immigration-threshold
// check. Self-contained (own state) so it can sit on the landing page and on
// its own /calculator route without any wiring.
export function ScoreCalculator() {
  const { c, nav, user, t } = useApp();
  const [profileId, setProfileId] = useState(CALC_PROFILES[0].id);
  const [scores, setScores] = useState({ co: "", ce: "", eo: "", ee: "" });
  const [result, setResult] = useState(null); // { co: { score, nclc }, ... } | null

  const profile = CALC_PROFILES.find((p) => p.id === profileId);
  const setScore = (s, v) => setScores((prev) => ({ ...prev, [s]: v }));

  const calculate = () => {
    setResult(Object.fromEntries(CALC_SECTIONS.map((s) => [s, { score: scores[s], nclc: nclcFor(s, scores[s]) }])));
  };

  // Threshold check is derived from the *current* profile, so switching the
  // target after computing updates the "Seuil" column without recalculating.
  const rows = result
    ? CALC_SECTIONS.map((s) => {
        const nclc = result[s].nclc;
        return { s, score: result[s].score, nclc, cecrl: nclc ? cecrlFor(nclc) : "—", min: profile.min[s], meets: (nclc || 0) >= profile.min[s] };
      })
    : [];
  const allMet = rows.length > 0 && rows.every((r) => r.meets);

  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3 mb-1.5">
        <span className="w-9 h-9 rounded-xl grad-brand text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0"><CalcIcon size={18} /></span>
        <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Vérifiez votre niveau TCF Canada")}</h3>
      </div>
      <p className={`text-sm ${c.sub} mb-5`}>{t("Choisissez votre objectif, entrez vos 4 scores, puis calculez vos niveaux NCLC.")}</p>

      {/* immigration target */}
      <div className="grid sm:grid-cols-3 gap-2.5 mb-5">
        {CALC_PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setProfileId(p.id)}
            aria-pressed={profileId === p.id}
            className={`text-left p-3 rounded-2xl border transition-colors ${profileId === p.id ? "border-blue-600 bg-blue-600/5 ring-1 ring-blue-600/30" : `${c.border} ${c.hoverSoft}`}`}
          >
            <p className={`text-sm font-bold ${c.text}`}>{t(p.label)}</p>
            <p className={`text-[11px] font-semibold mt-0.5 ${c.faint}`}>{t(p.desc)}</p>
          </button>
        ))}
      </div>

      {/* scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {CALC_SECTIONS.map((s) => (
          <div key={s}>
            <label htmlFor={`calc-${s}`} className={`block text-xs font-bold uppercase tracking-wide ${c.faint} mb-1.5`}>{SHORT[s]}</label>
            <input
              id={`calc-${s}`}
              type="number"
              inputMode="numeric"
              min={SCORE_RANGE[s].min}
              max={SCORE_RANGE[s].max}
              value={scores[s]}
              onChange={(e) => setScore(s, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") calculate(); }}
              aria-label={t(SECTION_LABELS[s])}
              className={`w-full px-3 py-2.5 rounded-xl border text-lg font-bold font-mono2 outline-none focus:border-blue-500 ${c.inputCls}`}
            />
            <p className={`text-[11px] font-mono2 mt-1 ${c.faint}`}>{SCORE_RANGE[s].hint}</p>
          </div>
        ))}
      </div>

      <Btn variant="accent" className="w-full" icon={ArrowRight} onClick={calculate}>{t("Calculer mon résultat")}</Btn>

      {result && (
        <div className={`mt-6 pt-6 border-t ${c.border} rise`}>
          <div className="mb-4">
            {allMet ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={15} /> {t("Seuils atteints pour ce profil")}</span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-amber-500/15 text-amber-600"><AlertTriangle size={15} /> {t("Seuils non atteints — continuez à progresser")}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-[11px] font-bold uppercase tracking-wide ${c.faint}`}>
                  <th className="py-2 pr-2 font-bold">{t("Épreuve")}</th>
                  <th className="py-2 px-2">{t("Score")}</th>
                  <th className="py-2 px-2">NCLC</th>
                  <th className="py-2 px-2">CECRL</th>
                  <th className="py-2 px-2">{t("Seuil")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.s} className={`border-t ${c.border}`}>
                    <td className={`py-2.5 pr-2 font-semibold whitespace-nowrap ${c.text}`}>{t(SECTION_LABELS[r.s])}</td>
                    <td className={`py-2.5 px-2 font-mono2 ${c.sub}`}>{r.score === "" ? "—" : r.score}</td>
                    <td className="py-2.5 px-2 font-bold text-blue-600 whitespace-nowrap">{r.nclc == null ? "—" : r.nclc === 0 ? t("< NCLC 4") : `NCLC ${r.nclc}`}</td>
                    <td className={`py-2.5 px-2 font-semibold ${c.sub}`}>{r.cecrl}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {r.meets
                        ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={13} /> NCLC {r.min}</span>
                        : <span className="inline-flex items-center gap-1 font-semibold text-amber-600">NCLC {r.min}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Btn variant="accent" className="flex-1" icon={ArrowRight} onClick={() => nav(user ? "exams" : "register")}>{t("Commencer ma préparation")}</Btn>
            <Btn variant="ghost" className="flex-1" icon={BookOpen} onClick={() => nav("guide")}>{t("Voir le guide complet")}</Btn>
          </div>
        </div>
      )}

      <p className={`mt-5 text-[11px] leading-relaxed ${c.faint}`}>{t("Conversion basée sur la grille d'équivalence TCF Canada → NCLC d'IRCC. Résultat indicatif : vérifiez toujours les seuils officiels de votre programme (IRCC, MIFI).")}</p>
    </Card>
  );
}
