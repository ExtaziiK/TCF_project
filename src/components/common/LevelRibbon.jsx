import { useApp } from "@/context/AppContext";
import { LEVELS } from "@/constants/levels";

// Signature element: the CEFR level ribbon (A1 → C2, blue → maple gradient)
export function LevelRibbon({ current = "B1", target = "B2", compact }) {
  const { c, t } = useApp();
  const ci = LEVELS.indexOf(current);
  const ti = LEVELS.indexOf(target);
  return (
    <div role="img" aria-label={`${t("Niveau actuel")} ${current}, ${t("objectif")} ${target}`}>
      {!compact && (
        <div className={`flex justify-between text-xs font-semibold mb-2 ${c.sub}`}>
          <span>{t("Niveau actuel")} · <span className="text-blue-600">{current}</span></span>
          <span>{t("Objectif")} · <span className="text-rose-600">{target}</span></span>
        </div>
      )}
      <div className="flex gap-1.5">
        {LEVELS.map((lv, i) => (
          <div key={lv} className="flex-1">
            <div className={`h-2.5 rounded-full ${i <= ci ? "grad-brand" : i === ti ? "bg-rose-600/30" : c.track}`} style={i <= ci ? { backgroundSize: "600% 100%", backgroundPosition: `${(i / 5) * 100}% 0` } : undefined} />
            <div className={`mt-1.5 text-center text-[10px] font-mono2 font-semibold ${i === ci ? "text-blue-600" : i === ti ? "text-rose-600" : c.faint}`}>{lv}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
