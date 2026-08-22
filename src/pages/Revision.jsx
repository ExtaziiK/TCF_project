import { useState, useMemo, useCallback } from "react";
import { ChevronDown, Search, Headphones, BookOpen, Check, Lightbulb, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";

// Révision — the hard half of every bank quiz, with its answers showing.
//
// A deliberate inversion of the quiz engine: nothing is hidden, nothing is
// scored, nothing is recorded. It exists to be READ, so the correct option is
// already green and the explanation is already open.
//
// Two facts about the bank drive the whole layout, and neither is obvious from
// the data model:
//
//   * `question.q` is not the question. For CE it is a generated placeholder
//     ("Compréhension écrite – Quiz 1 – Question 39") and the real passage is
//     the IMAGE; for CO it is a constant instruction and the real content is
//     the AUDIO. So a card is media first, and the identity a reader navigates
//     by (quiz number, question number, points) lives in the header instead.
//
//   * There are 800 of these per section. They are therefore grouped behind
//     collapsed quiz accordions, and a quiz's media is signed only when it is
//     opened — signing 1600 descriptors up front would be a very large request
//     for content nobody has scrolled to yet.
const FROM_QUESTION = 20; // 1-based: questions 20..39 of each quiz
const SECTIONS = ["co", "ce"];
const SECTION_ICON = { co: Headphones, ce: BookOpen };
// A wide search matches hundreds of cards, and rendering them all at once is
// what would make the page feel broken. Capped — and the cap is stated rather
// than silently truncating.
const SEARCH_LIMIT = 50;

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// The revision slice of one quiz: questions FROM_QUESTION..end, each stamped
// with where it came from so a search result can still say "Quiz 12 · Q27".
function sliceQuiz(quiz) {
  const qs = (quiz.questions || []).slice(FROM_QUESTION - 1);
  return qs.map((q, i) => ({
    ...q,
    quizNumber: quiz.quizNumber,
    quizTitle: quiz.title,
    order: FROM_QUESTION + i,
  }));
}

export function Revision() {
  const { c, t } = useApp();
  const [section, setSection] = useState("co");
  const [query, setQuery] = useState("");
  const [minPoints, setMinPoints] = useState(0);
  const [openQuiz, setOpenQuiz] = useState(null);

  const bank = getBank();

  const quizzes = useMemo(
    () => (bank[section] || [])
      .filter((q) => q.kind !== "prompt")
      .map((q) => ({ number: q.quizNumber, title: q.title, id: q.id, questions: sliceQuiz(q) }))
      .filter((q) => q.questions.length > 0),
    [bank, section],
  );

  const allQuestions = useMemo(() => quizzes.flatMap((q) => q.questions), [quizzes]);

  const pointsInPlay = useMemo(() => {
    const pts = allQuestions.map((q) => q.points).filter((p) => Number.isFinite(p));
    return pts.length ? [Math.min(...pts), Math.max(...pts)] : [0, 0];
  }, [allQuestions]);

  const matches = useCallback((q) => {
    if (minPoints > 0 && Number.isFinite(q.points) && q.points < minPoints) return false;
    if (!query.trim()) return true;
    // Options and explanation are the only real text on a question — `q.q` is a
    // placeholder, so searching it would match every card or none.
    const hay = norm([...(q.opts || []), q.exp].join(" "));
    return norm(query).split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
  }, [query, minPoints]);

  const filtering = query.trim().length > 0 || minPoints > 0;
  const results = useMemo(() => (filtering ? allQuestions.filter(matches) : []), [filtering, allQuestions, matches]);

  const switchSection = (s) => { setSection(s); setOpenQuiz(null); };

  return (
    <PageShell
      back wide
      eyebrow={t("Révision")}
      title={t("Les questions difficiles, réponses affichées")}
      sub={t("Les questions 20 à 39 de chaque quiz — la moitié la plus exigeante — avec la bonne réponse et l'explication déjà visibles.")}
    >
      <div className="flex justify-center mb-6">
        <div className={`inline-flex p-1 rounded-full border ${c.border}`} role="tablist">
          {SECTIONS.map((s) => {
            const Icon = SECTION_ICON[s];
            const on = section === s;
            return (
              <button
                key={s} role="tab" aria-selected={on} onClick={() => switchSection(s)}
                className={`px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${on ? "bg-blue-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}
              >
                <Icon size={15} aria-hidden="true" /> {t(SECTION_LABELS[s])}
              </button>
            );
          })}
        </div>
      </div>

      <Toolbar
        query={query} setQuery={setQuery}
        minPoints={minPoints} setMinPoints={setMinPoints}
        pointsInPlay={pointsInPlay}
        quizzes={quizzes} openQuiz={openQuiz} setOpenQuiz={setOpenQuiz}
        total={allQuestions.length}
      />

      {filtering ? (
        <SearchResults results={results} section={section} onClear={() => { setQuery(""); setMinPoints(0); }} />
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <QuizAccordion
              key={quiz.id}
              quiz={quiz}
              section={section}
              open={openQuiz === quiz.id}
              onToggle={() => setOpenQuiz(openQuiz === quiz.id ? null : quiz.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Toolbar({ query, setQuery, minPoints, setMinPoints, pointsInPlay, quizzes, openQuiz, setOpenQuiz, total }) {
  const { c, t } = useApp();
  const [lo, hi] = pointsInPlay;
  // A handful of thresholds rather than a free slider: points are only a proxy
  // for difficulty here, and "the very hardest" is the one cut anyone wants.
  const steps = [0, Math.round(lo + (hi - lo) * 0.34), Math.round(lo + (hi - lo) * 0.67)];
  return (
    <div className={`p-4 rounded-2xl border ${c.border} mb-5 flex flex-wrap items-center gap-3`}>
      <div className={`flex items-center gap-2 flex-1 min-w-[220px] px-3 py-2 rounded-xl border ${c.border}`}>
        <Search size={15} className={c.faint} aria-hidden="true" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Chercher dans les réponses et les explications…")}
          aria-label={t("Chercher dans les réponses et les explications")}
          className={`flex-1 bg-transparent outline-none text-sm ${c.text}`}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label={t("Effacer")} className={c.faint}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${c.faint}`}>{t("Difficulté")}</span>
        {steps.map((p, i) => (
          <button
            key={p} onClick={() => setMinPoints(p)} aria-pressed={minPoints === p}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${minPoints === p ? "border-blue-600 bg-blue-600/10 text-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}
          >
            {i === 0 ? t("Toutes") : `${p}+ pts`}
          </button>
        ))}
      </div>

      <select
        value={openQuiz || ""}
        onChange={(e) => setOpenQuiz(e.target.value || null)}
        aria-label={t("Aller au quiz")}
        className={`px-3 py-2 rounded-xl border text-sm ${c.border} ${c.text} bg-transparent`}
      >
        <option value="">{t("Aller au quiz…")}</option>
        {quizzes.map((q) => (
          <option key={q.id} value={q.id}>{t("Quiz")} {q.number ?? "?"}</option>
        ))}
      </select>

      <span className={`text-xs font-mono2 ${c.faint}`}>{total} {t("questions")}</span>
    </div>
  );
}

function SearchResults({ results, section, onClear }) {
  const { c, t } = useApp();
  if (results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className={`text-sm ${c.sub}`}>{t("Aucune question ne correspond.")}</p>
        <button onClick={onClear} className="mt-3 text-sm font-semibold text-blue-600">{t("Effacer les filtres")}</button>
      </Card>
    );
  }
  const shown = results.slice(0, SEARCH_LIMIT);
  return (
    <div className="space-y-4">
      <p className={`text-sm ${c.sub}`}>
        {results.length} {t(results.length > 1 ? "questions trouvées" : "question trouvée")}
        {results.length > SEARCH_LIMIT && (
          <span className={c.faint}> · {t("les")} {SEARCH_LIMIT} {t("premières sont affichées, affinez votre recherche")}</span>
        )}
      </p>
      <QuestionList questions={shown} section={section} />
    </div>
  );
}

function QuizAccordion({ quiz, section, open, onToggle }) {
  const { c, t } = useApp();
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle} aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left ${c.hoverSoft}`}
      >
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 font-mono2 font-bold text-sm flex items-center justify-center">
            {String(quiz.number ?? "?").padStart(2, "0")}
          </span>
          <span className={`font-display font-bold ${c.text}`}>{t("Quiz")} {quiz.number ?? "?"}</span>
        </span>
        <span className="flex items-center gap-3">
          <Pill tone="slate">{quiz.questions.length} {t("questions")}</Pill>
          <ChevronDown size={18} className={`${c.faint} transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {/* Mounted only while open: this is what keeps 40 quizzes cheap, and what
          defers signing the quiz's media until someone actually looks at it. */}
      {open && (
        <div className={`px-5 pb-5 pt-1 border-t ${c.border}`}>
          <QuestionList questions={quiz.questions} section={section} />
        </div>
      )}
    </Card>
  );
}

// Signing happens here rather than per card: useSignedQuestions batches one
// request for the whole list, and `questions` is referentially stable because
// it comes from the memoised slice above.
function QuestionList({ questions, section }) {
  const signed = useSignedQuestions(questions);
  return (
    <div className="space-y-4 mt-4">
      {signed.map((q) => <QuestionCard key={q.id} q={q} section={section} />)}
    </div>
  );
}

function QuestionCard({ q, section }) {
  const { c, t } = useApp();
  // Shown only when it carries meaning. CE's placeholder ("Compréhension
  // écrite – Quiz 1 – Question 39") merely repeats the header and is dropped;
  // CO's instruction ("Écoutez le document sonore…") tells the reader what to do.
  const stem = /^Compr[ée]hension\s+[ée]crite\s+[–-]/i.test(String(q.q || "")) ? null : q.q;

  return (
    <div className={`p-5 rounded-2xl border ${c.border}`}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-mono2 font-semibold ${c.faint}`}>
          {SECTION_LABELS[section]} · {t("Quiz")} {q.quizNumber ?? "?"} · Q{q.order}
        </span>
        {Number.isFinite(q.points) && <Pill tone="slate">{q.points} pts</Pill>}
      </div>

      {stem && <p className={`text-sm font-medium mb-3 ${c.text}`}>{stem}</p>}

      <BankQuestionMedia question={q} allowReplay />

      <ul className="mt-4 space-y-2">
        {(q.opts || []).map((o, i) => {
          const right = i === q.a;
          return (
            <li
              key={i}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm ${right ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 font-semibold" : `${c.border} ${c.sub}`}`}
            >
              <span className={`font-mono2 text-xs mt-0.5 ${right ? "" : c.faint}`}>{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{o}</span>
              {right && <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>

      {q.exp && (
        <p className={`mt-3 flex gap-2 text-sm leading-relaxed ${c.sub}`}>
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{q.exp}</span>
        </p>
      )}
    </div>
  );
}
