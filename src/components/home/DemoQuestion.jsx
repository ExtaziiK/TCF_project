import { useMemo, useState } from "react";
import { Headphones, CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { AudioPlayer } from "@/components/quiz";
import { LISTEN_QS } from "@/constants/listening";
import DEMO_CO from "virtual:bank-demo-co";
import { useQuizByNumber } from "@/hooks/useBank";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { DemoSteps } from "@/components/home/DemoSteps";

// Picks a random B2 Compréhension orale item from Quiz 1 of the actual bank
// (pool in src/constants/demoPool.js: questions 21–29, the B2 stretch with full
// text options), so the teaser varies each visit while staying at a
// representative level. The text is baked in at build time
// (virtual:bank-demo-co), so the card renders on the first frame — swapping a
// skeleton for it was a layout shift in the hero. Falls back to the curated
// LISTEN_QS demo if the pool is ever empty.
function pickDemoQuestion() {
  if (!DEMO_CO.length) return LISTEN_QS[0];
  const picked = DEMO_CO[Math.floor(Math.random() * DEMO_CO.length)];
  return { ...picked, level: "B2", kind: "bank" };
}

// Hero teaser: one real CO question presented exactly like the quiz pages —
// audio player on top, lettered options, correction and explanation below.
// `embedded`: shown inside the tools showcase's Compréhension orale panel,
// which already names the épreuve — so no card, pills or glow of its own.
export function DemoQuestion({ embedded = false }) {
  const { c, nav, t } = useApp();
  const [sel, setSel] = useState(null);
  const [base] = useState(pickDemoQuestion);
  // The audio comes from the real bank question, in quiz 1's chunk (fetched
  // after the page has rendered): it carries the `sign` descriptor that
  // useSignedQuestions exchanges for a short-lived signed URL (quiz 1 is
  // signable anonymously), or the plain URL when signing is off. Until then
  // the player shows its placeholder — same footprint, nothing moves.
  const { quiz: quiz1 } = useQuizByNumber("co", 1);
  const full = base.kind === "bank" ? quiz1?.questions.find((x) => x.id === base.id) : null;
  const withMedia = useMemo(() => (full ? { ...full, level: base.level, kind: base.kind } : base), [full, base]);
  const singleton = useMemo(() => [withMedia], [withMedia]);
  const [q] = useSignedQuestions(singleton);
  const isBankItem = q.kind === "bank";
  const questionLabel = q.q;
  const explanation = isBankItem
    ? `${t("Bonne réponse :")} « ${q.opts[q.a]} ». ${t("C'est la seule proposition fidèle à ce qu'annonce l'enregistrement.")}`
    : q.exp;
  return (
    <div className={embedded ? "flex-1 flex flex-col gap-4" : "space-y-4"}>
      <AudioPlayer src={q.audio} />
      <Card className={`relative overflow-hidden ${embedded ? "flex-1 p-5" : "p-6 md:p-7 shadow-2xl shadow-blue-600/10"}`}>
        {!embedded && <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl" aria-hidden="true" />}
        {!embedded && (
          <div className="flex items-center justify-between mb-4 relative">
            <Pill tone="blue"><Headphones size={12} /> {t("Question du jour · CO")}</Pill>
            <Pill tone="slate">{t("Niveau")} {q.level}</Pill>
          </div>
        )}
        {isBankItem
          ? <DemoSteps steps={["Lancez l'audio ci-dessus", "Cliquez sur la bonne réponse"]} done={sel !== null} />
          : <p className={`text-sm leading-relaxed mb-5 ${c.text}`}>{questionLabel}</p>}
        <div className="space-y-2.5">
          {q.opts.map((o, i) => {
            const state = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
            return (
              <button key={o} disabled={sel !== null} onClick={() => setSel(i)}
                className={`group w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-2
                ${state === "idle" ? `${c.border} ${c.text} cursor-pointer hover:border-blue-600 hover:bg-blue-600/10 hover:-translate-y-0.5 hover:shadow-md` : ""}
                ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
                <span className="flex items-center"><span className={`font-mono2 font-bold mr-3 w-6 h-6 rounded-lg grid place-items-center shrink-0 text-xs ${state === "idle" ? "border border-current opacity-70 group-hover:opacity-100" : "opacity-60"}`}>{String.fromCharCode(65 + i)}</span>{o}</span>
                {state === "right" && <CheckCircle2 size={17} className="shrink-0" />}
                {state === "wrong" && <XCircle size={17} className="shrink-0" />}
              </button>
            );
          })}
        </div>
        {sel !== null && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-600/10 text-sm rise">
            <p className="font-semibold text-blue-600 flex items-center gap-1.5 mb-1"><Lightbulb size={14} /> {t("Explication")}</p>
            <p className={c.sub}>{explanation}</p>
            <Btn small className="mt-4" icon={ArrowRight} onClick={() => nav("practice")}>{t("Continuer en pratique gratuite")}</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
