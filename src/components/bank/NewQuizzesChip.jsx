import { ArrowRight, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { newQuizCount } from "@/constants/quizNew";

// "What's new" chip announcing the quizzes listed in constants/quizNew.js,
// linking to the Épreuves grid where they carry their "Nouveau" badge. Shown on
// the landing page and the member dashboard; renders nothing once the list is
// emptied.
export function NewQuizzesChip({ className = "" }) {
  const { c, t, nav } = useApp();
  const ce = newQuizCount("ce");
  const co = newQuizCount("co");
  const total = ce + co;
  if (!total) return null;
  const where = ce && co ? "en compréhension écrite et orale" : ce ? "en compréhension écrite" : "en compréhension orale";
  return (
    <button
      type="button"
      onClick={() => nav("exams")}
      className={`group inline-flex items-center gap-2 max-w-full rounded-full border border-rose-600/30 ${c.card} pl-1 pr-3 py-1 text-left text-xs sm:text-sm shadow-sm hover:border-rose-600/60 transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
        <Sparkles size={11} aria-hidden="true" /> {t("Nouveau")}
      </span>
      <span className={`min-w-0 ${c.text}`}>
        <span className="font-semibold">{total} {t("nouveaux quiz")}</span>
        <span className={`hidden sm:inline ${c.sub}`}> {t(where)}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-rose-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}
