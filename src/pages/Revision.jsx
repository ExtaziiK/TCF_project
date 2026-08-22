import { useState, useMemo, useCallback } from "react";
import { ChevronDown, Search, Headphones, BookOpen, Check, Lightbulb, X, Eye, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";

// Révision — the hard half of every bank quiz, read or rehearsed.
//
// Two modes over one bank. "Lire les corrigés" is a revision sheet: the correct
// option is already green and the explanation already open, because the page is
// there to be READ. "S'entraîner" withholds both until a choice is made, then
// corrects on the spot.
//
// Neither records anything. That is the point rather than an omission: these
// are the questions 20-39 of quizzes a candidate can also sit properly, with
// the answers one toggle away, so a score here would say nothing about exam
// performance — and folding it into quiz_results would quietly flatter the
// dashboard averages that do.
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
  const [level, setLevel] = useState("all");
  const [openQuiz, setOpenQuiz] = useState(null);
  // "read": the revision sheet, everything already showing.
  // "practice": the same bank, answers withheld until you choose.
  // Deliberately NOT recorded to quiz_results: this is the hard tail of every
  // quiz with its answers a click away, so scoring it would flatter the
  // dashboard averages that are supposed to describe exam performance.
  const [mode, setMode] = useState("read");

  const bank = getBank();

  const quizzes = useMemo(
    () => (bank[section] || [])
      .filter((q) => q.kind !== "prompt")
      .map((q) => ({ number: q.quizNumber, title: q.title, id: q.id, questions: sliceQuiz(q) }))
      .filter((q) => q.questions.length > 0),
    [bank, section],
  );

  const allQuestions = useMemo(() => quizzes.flatMap((q) => q.questions), [quizzes]);

  // The difficulty filter is built from the data rather than from fixed
  // thresholds, because the two épreuves do not carry difficulty the same way.
  //
  // CO questions have `points` — and only three distinct values in this range
  // (21, 26, 33), so exact buttons beat "25+ / 29+" ranges that were guessing
  // at boundaries the data already states.
  //
  // CE questions have NO points at all. Rather than show a filter that can
  // never match anything, fall back to the question number, which carries the
  // same signal: the TCF ramps difficulty with position, which is exactly why
  // CO's points climb with it too.
  const levels = useMemo(() => {
    const pts = [...new Set(allQuestions.map((q) => q.points).filter((p) => Number.isFinite(p)))].sort((a, b) => a - b);
    if (pts.length) {
      return pts.map((p) => ({
        id: `p${p}`,
        label: `${p} pts`,
        count: allQuestions.filter((q) => q.points === p).length,
        test: (q) => q.points === p,
      }));
    }
    const bands = [[20, 26], [27, 32], [33, 39]];
    return bands.map(([from, to]) => ({
      id: `r${from}`,
      label: `Q${from}–${to}`,
      count: allQuestions.filter((q) => q.order >= from && q.order <= to).length,
      test: (q) => q.order >= from && q.order <= to,
    })).filter((l) => l.count > 0);
  }, [allQuestions]);

  const activeLevel = levels.find((l) => l.id === level) || null;

  const matches = useCallback((q) => {
    if (activeLevel && !activeLevel.test(q)) return false;
    if (!query.trim()) return true;
    // Options and explanation are the only real text on a question — `q.q` is a
    // placeholder, so searching it would match every card or none.
    const hay = norm([...(q.opts || []), q.exp].join(" "));
    return norm(query).split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
  }, [query, activeLevel]);

  const filtering = query.trim().length > 0 || activeLevel != null;
  const results = useMemo(() => (filtering ? allQuestions.filter(matches) : []), [filtering, allQuestions, matches]);

  // The levels are per-section, so a CO points filter cannot survive a jump to
  // CE — it would match nothing and read as an empty épreuve.
  const switchSection = (s) => { setSection(s); setOpenQuiz(null); setLevel("all"); };
  // Changing mode closes the open quiz so the list remounts: answers given in
  // practice must not linger, greyed out, behind the reading view.
  const switchMode = (m) => { setMode(m); setOpenQuiz(null); };

  return (
    <PageShell
      back wide
      eyebrow={t("Révision")}
      title={t(mode === "read" ? "Les questions difficiles, réponses affichées" : "Les questions difficiles, à vous de répondre")}
      sub={t(mode === "read"
        ? "Les questions 20 à 39 de chaque quiz — la moitié la plus exigeante — avec la bonne réponse et l'explication déjà visibles."
        : "Les mêmes questions, réponses masquées : choisissez, la correction et l'explication s'affichent aussitôt.")}
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

      <div className="flex justify-center mb-6">
        <div className={`inline-flex p-1 rounded-full border ${c.border}`} role="group" aria-label={t("Mode")}>
          {[{ id: "read", label: "Lire les corrigés", Icon: Eye }, { id: "practice", label: "S'entraîner", Icon: PenLine }].map((m) => (
            <button
              key={m.id} onClick={() => switchMode(m.id)} aria-pressed={mode === m.id}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${mode === m.id ? "bg-rose-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}
            >
              <m.Icon size={14} aria-hidden="true" /> {t(m.label)}
            </button>
          ))}
        </div>
      </div>

      <Toolbar
        query={query} setQuery={setQuery}
        levels={levels} level={level} setLevel={setLevel}
        quizzes={quizzes} openQuiz={openQuiz} setOpenQuiz={setOpenQuiz}
        total={allQuestions.length}
      />

      {filtering ? (
        <SearchResults results={results} section={section} mode={mode} onClear={() => { setQuery(""); setLevel("all"); }} />
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <QuizAccordion
              key={quiz.id}
              quiz={quiz}
              section={section}
              mode={mode}
              open={openQuiz === quiz.id}
              onToggle={() => setOpenQuiz(openQuiz === quiz.id ? null : quiz.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Toolbar({ query, setQuery, levels, level, setLevel, quizzes, openQuiz, setOpenQuiz, total }) {
  const { c, t } = useApp();
  const options = [{ id: "all", label: t("Toutes"), count: total }, ...levels];
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

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs font-semibold ${c.faint}`}>{t("Difficulté")}</span>
        {options.map((o) => (
          <button
            key={o.id} onClick={() => setLevel(o.id)} aria-pressed={level === o.id}
            title={`${o.count} ${t("questions")}`}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${level === o.id ? "border-blue-600 bg-blue-600/10 text-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}
          >
            {o.label} <span className={level === o.id ? "opacity-70" : c.faint}>{o.count}</span>
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

function SearchResults({ results, section, mode, onClear }) {
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
      <QuestionList questions={shown} section={section} mode={mode} />
    </div>
  );
}

function QuizAccordion({ quiz, section, mode, open, onToggle }) {
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
          <QuestionList questions={quiz.questions} section={section} mode={mode} />
        </div>
      )}
    </Card>
  );
}

// Signing happens here rather than per card: useSignedQuestions batches one
// request for the whole list, and `questions` is referentially stable because
// it comes from the memoised slice above.
//
// In practice mode this also owns the answers, so the score belongs to the list
// you are working through (one quiz, or one set of search results) rather than
// to the page. Switching quiz or mode unmounts it and the slate is clean —
// which is the intended behaviour: nothing here is a record, only a rehearsal.
function QuestionList({ questions, section, mode }) {
  const { c, t } = useApp();
  const signed = useSignedQuestions(questions);
  const [answers, setAnswers] = useState({});

  const answer = useCallback((id, choice) => {
    // First answer only — this is a rehearsal, not a retry loop.
    setAnswers((prev) => (prev[id] != null ? prev : { ...prev, [id]: choice }));
  }, []);

  const done = Object.keys(answers).length;
  const right = signed.filter((q) => answers[q.id] != null && answers[q.id] === q.a).length;

  return (
    <div className="mt-4">
      {mode === "practice" && (
        <div className={`flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl ${c.hoverSoft}`}>
          <span className={`text-sm font-semibold ${c.text}`}>
            {done > 0
              ? <>{right} / {done} {t("bonnes réponses")}{done < signed.length && <span className={c.faint}> · {signed.length - done} {t("encore à faire")}</span>}</>
              : <span className={c.sub}>{t("Choisissez une réponse — la correction s'affiche aussitôt.")}</span>}
          </span>
          {done > 0 && (
            <button onClick={() => setAnswers({})} className="text-sm font-semibold text-blue-600 shrink-0">
              {t("Recommencer")}
            </button>
          )}
        </div>
      )}
      <div className="space-y-4">
        {signed.map((q) => (
          <QuestionCard
            key={q.id} q={q} section={section} mode={mode}
            chosen={answers[q.id]} onAnswer={(i) => answer(q.id, i)}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ q, section, mode, chosen, onAnswer }) {
  const { c, t } = useApp();
  // Reading mode shows everything from the outset; practice mode holds the
  // answer and the explanation back until a choice is made. `chosen` is the
  // index picked, or undefined while the question is still open.
  const revealed = mode === "read" || chosen != null;
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
          const isRight = i === q.a;
          const isPick = chosen === i;
          // Four states, and only after an answer: the right one, the wrong one
          // that was picked, and the rest dimmed. Before answering every option
          // looks alike, or the shape of the card would give the answer away.
          const tone = !revealed ? "idle"
            : isRight ? "right"
              : isPick ? "wrong" : "dim";
          const cls = {
            idle: `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5 cursor-pointer`,
            right: "border-emerald-500 bg-emerald-500/10 text-emerald-700 font-semibold",
            wrong: "border-rose-500 bg-rose-500/10 text-rose-700 font-semibold",
            dim: `${c.border} ${c.sub} opacity-60`,
          }[tone];
          const body = (
            <>
              <span className={`font-mono2 text-xs mt-0.5 ${tone === "right" || tone === "wrong" ? "" : c.faint}`}>{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{o}</span>
              {tone === "right" && <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />}
              {tone === "wrong" && <X size={15} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />}
            </>
          );
          const shared = `w-full flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-all ${cls}`;
          return (
            <li key={i}>
              {mode === "practice" && !revealed ? (
                <button type="button" onClick={() => onAnswer(i)} className={shared}>{body}</button>
              ) : (
                <div className={shared}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Held back with the answer: showing why before the choice is made would
          hand over the answer in prose. */}
      {revealed && q.exp && (
        <p className={`mt-3 flex gap-2 text-sm leading-relaxed rise ${c.sub}`}>
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{q.exp}</span>
        </p>
      )}
    </div>
  );
}
