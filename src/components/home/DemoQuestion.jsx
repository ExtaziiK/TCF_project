import { useMemo, useState } from "react";
import { Headphones, CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { AudioPlayer } from "@/components/quiz";
import { LISTEN_QS } from "@/constants/listening";
import { getBank } from "@/services/bankService";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";

// B2 band of Quiz 1. The bank carries no per-question CEFR tag, but the official
// TCF manual states items are ordered by increasing difficulty within an épreuve;
// across 39 questions spread A1→C2, the upper-middle stretch (questions ~21–29)
// lands in B2 — past the A1/A2/B1 openers, short of the C1/C2 closers. These are
// also the items with full text options (the first 8 are image/audio-only).
const B2_BAND = [20, 21, 22, 23, 24, 25, 26, 27, 28]; // 0-based → questions 21–29

// Picks a random B2 Compréhension orale item from Quiz 1 of the actual bank
// (src/bank/co/Quiz_1_CO.json), so the teaser varies each visit while staying at
// a representative level. Falls back to the curated LISTEN_QS demo if the bank
// is ever unavailable.
function realDemoQuestion() {
  const quiz1 = getBank().co.find((quiz) => quiz.quizNumber === 1);
  const questions = quiz1?.questions || [];
  if (!questions.length) return null;
  const band = B2_BAND.filter((i) => i < questions.length);
  const idx = band.length ? band[Math.floor(Math.random() * band.length)] : Math.floor((questions.length - 1) / 2);
  const picked = questions[idx];
  return picked ? { ...picked, level: "B2", kind: "bank" } : null;
}

// Hero teaser: one real CO question presented exactly like the quiz pages —
// audio player on top, lettered options, correction and explanation below.
export function DemoQuestion() {
  const { c, nav, t } = useApp();
  const [sel, setSel] = useState(null);
  // Chosen once per mount. Bank items carry a `sign` descriptor; useSignedQuestions
  // swaps it for a short-lived signed audio URL (quiz 1 is signable anonymously,
  // so the audio plays on the public home page too). With signing off it's a no-op.
  const [base] = useState(() => realDemoQuestion() || LISTEN_QS[0]);
  const singleton = useMemo(() => [base], [base]);
  const [q] = useSignedQuestions(singleton);
  const isBankItem = q.kind === "bank";
  const questionLabel = isBankItem ? t("Écoutez le document sonore, puis choisissez la bonne réponse.") : q.q;
  const explanation = isBankItem
    ? `${t("Bonne réponse :")} « ${q.opts[q.a]} ». ${t("C'est la seule proposition fidèle à ce qu'annonce l'enregistrement.")}`
    : q.exp;
  return (
    <div className="space-y-4">
      <AudioPlayer src={q.audio} />
      <Card className="p-6 md:p-7 shadow-2xl shadow-blue-600/10 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl" aria-hidden="true" />
        <div className="flex items-center justify-between mb-4 relative">
          <Pill tone="blue"><Headphones size={12} /> {t("Question du jour · CO")}</Pill>
          <Pill tone="slate">{t("Niveau")} {q.level}</Pill>
        </div>
        <p className={`text-sm leading-relaxed mb-5 ${c.text}`}>{questionLabel}</p>
        <div className="space-y-2.5">
          {q.opts.map((o, i) => {
            const state = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
            return (
              <button key={o} disabled={sel !== null} onClick={() => setSel(i)}
                className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-2
                ${state === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
                ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
                <span><span className="font-mono2 font-semibold mr-3 opacity-60">{String.fromCharCode(65 + i)}</span>{o}</span>
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
