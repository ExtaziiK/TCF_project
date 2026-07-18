import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, XCircle, Lightbulb, ArrowRight, ZoomIn, ZoomOut } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { getBank } from "@/services/bankService";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";

// A2 / B1 bands of Quiz 1. The bank carries no per-question CEFR tag, but the
// official TCF orders items by increasing difficulty across the 39-question
// épreuve (A1→C2), so the early-middle stretch is A2 then B1 — past the A1
// openers, short of the B2/C1/C2 closers. Indices are 0-based (question order−1).
const A2_BAND = [5, 6, 7, 8, 9, 10, 11, 12];   // questions 6–13
const B1_BAND = [13, 14, 15, 16, 17, 18, 19, 20, 21]; // questions 14–22

// Picks a random A2/B1 Compréhension écrite item from Quiz 1 of the actual bank
// (src/bank/ce/Quiz_1_CE.json). CE items are read from a document image, so the
// stimulus is the (signed) image rather than an audio clip. Returns null if the
// bank is unavailable, in which case the card simply isn't rendered.
function realDemoQuestion() {
  const quiz1 = getBank().ce.find((quiz) => quiz.quizNumber === 1);
  const questions = quiz1?.questions || [];
  if (!questions.length) return null;
  const pool = [...A2_BAND, ...B1_BAND].filter((i) => i < questions.length);
  const idx = pool.length ? pool[Math.floor(Math.random() * pool.length)] : Math.floor((questions.length - 1) / 2);
  const picked = questions[idx];
  if (!picked) return null;
  return { ...picked, level: A2_BAND.includes(idx) ? "A2" : "B1", kind: "bank" };
}

// Hero teaser mirroring the CO DemoQuestion, for Compréhension écrite: the
// reading document on top (a short-lived signed image — quiz 1 is signable
// anonymously), then the lettered options, correction and explanation below.
export function DemoQuestionCE() {
  const { c, nav, t } = useApp();
  const [sel, setSel] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const [big, setBig] = useState(false);
  const [base] = useState(realDemoQuestion);
  const singleton = useMemo(() => (base ? [base] : []), [base]);
  const [signed] = useSignedQuestions(singleton);
  const q = signed || base;
  if (!q) return null;

  const explanation = `${t("Bonne réponse :")} « ${q.opts[q.a]} ». ${q.exp || t("C'est la seule proposition fidèle au document.")}`;

  return (
    <div className="space-y-4">
      {q.image && imgOk && (
        <div className={`rounded-2xl border ${c.border} ${c.card} p-2 shadow-xl shadow-rose-600/10`}>
          {/* Same in-place "Agrandir" magnifier as the bank quiz's document
              frame (BankQuestionMedia), so the fine print stays readable. */}
          <div className="relative">
            <img
              src={q.image}
              alt={t("Document à lire")}
              onError={() => setImgOk(false)}
              className={`w-full object-contain rounded-xl transition-all duration-300 ${big ? "max-h-[80vh]" : "max-h-64"}`}
            />
            <button
              type="button"
              onClick={() => setBig((v) => !v)}
              aria-label={big ? t("Réduire l'image") : t("Agrandir l'image")}
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/70 text-white shadow-lg hover:bg-slate-900/90 transition-colors"
            >
              {big ? <><ZoomOut size={14} /> {t("Réduire")}</> : <><ZoomIn size={14} /> {t("Agrandir")}</>}
            </button>
          </div>
        </div>
      )}
      <Card className="p-6 md:p-7 shadow-xl shadow-rose-600/10 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-600/10 blur-2xl" aria-hidden="true" />
        <div className="flex items-center justify-between mb-4 relative">
          <Pill tone="red"><BookOpen size={12} /> {t("Question du jour · CE")}</Pill>
          <Pill tone="slate">{t("Niveau")} {q.level}</Pill>
        </div>
        <p className={`text-sm leading-relaxed mb-5 ${c.text}`}>{t("Lisez le document, puis choisissez la bonne réponse.")}</p>
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
          <div className="mt-4 p-4 rounded-2xl bg-rose-600/10 text-sm rise">
            <p className="font-semibold text-rose-600 flex items-center gap-1.5 mb-1"><Lightbulb size={14} /> {t("Explication")}</p>
            <p className={c.sub}>{explanation}</p>
            <Btn small variant="accent" className="mt-4" icon={ArrowRight} onClick={() => nav("reading")}>{t("Continuer en pratique gratuite")}</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
