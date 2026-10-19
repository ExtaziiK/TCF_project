import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";

const FILL = "bg-[var(--tool-fill,#2563EB)] text-white";

// One month's subjects dealt one unit at a time — a combinaison for EE, a
// partie for EO — laid out like the Révision deck. Numbered chips jump
// anywhere, Précédent/Suivant sit both above and below the card, and the ← →
// keys work too, so moving between units never needs a scroll. Shared by the
// Anciens sujets pages and Sujets d'actualité.
//
//   units    -> [{ key, n, node }]
//   unitName -> "Combinaison" | "Partie" (labels the chips)
//   summary  -> pills shown above the card
//   aside    -> extra content on the summary row's right (e.g. a link)
//
// The index lives here, so give it a `key` that changes with the month (and
// EO's tâche): a new set starts back at its first unit.
export function SujetsDeck({ units, unitName, summary, aside }) {
  const { c, t } = useApp();
  const [index, setIndex] = useState(0);
  const deckRef = useRef(null);
  const n = units.length;
  const i = Math.min(index, Math.max(0, n - 1));

  // Moving from the bottom buttons after reading a long card would leave the
  // next one scrolled half out of view: bring the deck's top back when it sits
  // above the fold (or under the fixed nav). Clicks near the top don't scroll.
  const goTo = useCallback((k) => {
    setIndex(Math.max(0, Math.min(n - 1, k)));
    window.requestAnimationFrame(() => {
      const el = deckRef.current;
      if (el && el.getBoundingClientRect().top < 96) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [n]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
      if (e.key === "ArrowRight") goTo(i + 1);
      if (e.key === "ArrowLeft") goTo(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, i]);

  const current = units[i];
  const navBtn = "inline-flex items-center gap-1.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-colors";

  return (
    <div ref={deckRef} className="scroll-mt-28">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex flex-wrap items-center gap-2">{summary}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {aside}
          {n > 1 && (
            <>
              <span className={`font-mono2 text-sm font-semibold ${c.faint}`}>{i + 1} / {n}</span>
              <button type="button" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label={t("Précédent")}
                className={`${navBtn} w-9 h-9 justify-center border ${c.border} ${c.card} ${c.text} ${c.hoverSoft}`}><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => goTo(i + 1)} disabled={i === n - 1} aria-label={t("Suivant")}
                className={`${navBtn} w-9 h-9 justify-center ${FILL}`}><ChevronRight size={16} /></button>
            </>
          )}
        </div>
      </div>

      {n > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={t(unitName)}>
          {units.map((u, k) => (
            <button type="button" key={u.key} onClick={() => goTo(k)} aria-current={k === i ? "step" : undefined}
              aria-label={`${t(unitName)} ${u.n}`}
              className={`min-w-9 h-9 px-2 rounded-lg font-mono2 text-xs font-bold transition-colors ${k === i ? FILL : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
              {String(u.n).padStart(2, "0")}
            </button>
          ))}
        </div>
      )}

      {current ? (
        <div key={current.key} className="rise">{current.node}</div>
      ) : (
        <Card className="p-10 text-center">
          <p className={`text-sm ${c.sub}`}>{t("Aucun sujet pour ce mois.")}</p>
        </Card>
      )}

      {n > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => goTo(i - 1)} disabled={i === 0}
            className={`${navBtn} px-4 py-2.5 border ${c.border} ${c.card} ${c.text} ${c.hoverSoft}`}>
            <ChevronLeft size={16} /> {t("Précédent")}
          </button>
          <span className={`hidden sm:block text-xs ${c.faint}`}>{t("Flèches ← → du clavier")}</span>
          <button type="button" onClick={() => goTo(i + 1)} disabled={i === n - 1}
            className={`${navBtn} px-4 py-2.5 ${FILL}`}>
            {t("Suivant")} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
