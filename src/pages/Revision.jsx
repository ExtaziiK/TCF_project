import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Headphones, BookOpen, Check, Lightbulb, X, Eye, PenLine, ListChecks, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, BankLoading, Segmented } from "@/components/common";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { useBank } from "@/hooks/useBank";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { isStaff } from "@/auth/rbac";
import { isUnderReview } from "@/constants/quizReview";

// Révision — the hard half of every bank quiz, read or rehearsed, as a deck.
//
// One control bar (épreuve, mode, search, difficulty), a compact quiz picker,
// and the questions of the picked quiz dealt one at a time: a progress strip
// to jump around (green/red as practice answers come in), previous/next, and
// the arrow keys. A search turns the deck into its results, across quizzes.
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
// Two facts about the bank drive the layout, and neither is obvious from the
// data model:
//
//   * `question.q` is not the question. For CE it is a generated placeholder
//     ("Compréhension écrite – Quiz 1 – Question 39") and the real passage is
//     the IMAGE; for CO it is a constant instruction and the real content is
//     the AUDIO. So a card is media first, and the identity a reader navigates
//     by (quiz number, question number, points) lives in the header instead.
//
//   * There are 800 of these per section. Only one deck is mounted at a time,
//     and its media is signed when it mounts — signing 1600 descriptors up front
//     would be a very large request for content nobody has looked at yet.
const FROM_QUESTION = 20; // 1-based: questions 20..39 of each quiz
const SECTIONS = ["co", "ce"];
const SECTION_ICON = { co: Headphones, ce: BookOpen };
// A wide search matches hundreds of cards; the deck takes the first ones and
// says so rather than silently truncating.
const SEARCH_LIMIT = 50;
const FILL = "bg-[var(--tool-fill,#2563EB)] text-white";

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
  const { c, t, role } = useApp();
  const staff = isStaff(role);
  const [section, setSection] = useState("co");
  const [query, setQuery] = useState("");
  // Les niveaux cochés. Liste vide = « Toutes » : c'est l'absence de filtre
  // qui vaut « tout », et non un identifiant « all » qui se retrouverait à
  // devoir être retiré de la liste à chaque fois qu'un autre est coché.
  const [levelIds, setLevelIds] = useState([]);
  const [quizId, setQuizId] = useState(null);
  // "read": the revision sheet, everything already showing.
  // "practice": the same bank, answers withheld until you choose.
  const [mode, setMode] = useState("read");

  // The épreuve's quizzes download when it is picked (null meanwhile).
  const { bank, error, retry } = useBank(section);

  const quizzes = useMemo(
    () => (bank?.[section] || [])
      // A quiz under review has known-wrong answers; members don't get to
      // revise from them (staff still do, to check the fix).
      .filter((q) => q.kind !== "prompt" && (staff || !isUnderReview(q)))
      .map((q) => ({ number: q.quizNumber, title: q.title, id: q.id, questions: sliceQuiz(q) }))
      .filter((q) => q.questions.length > 0),
    [bank, section, staff],
  );
  const current = quizzes.find((q) => q.id === quizId) || quizzes[0] || null;
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
      return pts.map((p) => ({ id: `p${p}`, label: `${p} pts`, test: (q) => q.points === p }));
    }
    const bands = [[20, 26], [27, 32], [33, 39]];
    return bands
      .map(([from, to]) => ({ id: `r${from}`, label: `Q${from}–${to}`, test: (q) => q.order >= from && q.order <= to }))
      .filter((l) => allQuestions.some(l.test));
  }, [allQuestions]);

  // Filtrés depuis `levels` plutôt que lus tels quels : un identifiant qui ne
  // correspond plus à rien (changement d'épreuve, données rechargées) est
  // ignoré au lieu de vider le paquet sans explication.
  const activeLevels = useMemo(() => levels.filter((l) => levelIds.includes(l.id)), [levels, levelIds]);
  // Une question porte un seul niveau : cocher « 21 pts » et « 33 pts » doit
  // donc donner les deux lots réunis. Un ET ne ramènerait jamais rien.
  const levelOk = useCallback((q) => !activeLevels.length || activeLevels.some((l) => l.test(q)), [activeLevels]);

  const searching = query.trim().length > 0;
  const results = useMemo(() => {
    if (!searching) return [];
    // Options and explanation are the only real text on a question — `q.q` is a
    // placeholder, so searching it would match every card or none.
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return allQuestions.filter((q) => levelOk(q) && terms.every((term) => norm([...(q.opts || []), q.exp].join(" ")).includes(term)));
  }, [searching, query, allQuestions, levelOk]);

  const deck = useMemo(
    () => (searching ? results.slice(0, SEARCH_LIMIT) : (current?.questions || []).filter(levelOk)),
    [searching, results, current, levelOk],
  );
  // A new deck (other quiz, search, filter, mode or épreuve) starts fresh: the
  // practice answers belong to the deck being worked through, not to the page.
  const deckKey = `${section}|${searching ? `s:${query}` : current?.id}|${levelIds.join(",")}|${mode}`;

  // The levels are per-section, so a CO points filter cannot survive a jump to
  // CE — it would match nothing and read as an empty épreuve.
  const switchSection = (s) => { setSection(s); setQuizId(null); setLevelIds([]); setQuery(""); };
  const toggleLevel = (id) => setLevelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <PageShell tone="rose" icon={ListChecks} back wide
      eyebrow={t("Révision")}
      title={t("Les questions difficiles")}
      sub={t("Les questions 20 à 39 de chaque quiz, une à la fois.")}
    >
      {/* ── control bar ─────────────────────────────────────────────────── */}
      <Card className="p-3 md:p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            items={SECTIONS.map((s) => ({ id: s, label: SECTION_LABELS[s], Icon: SECTION_ICON[s] }))}
            value={section} onChange={switchSection} label={t("Épreuve")}
          />
          <Segmented
            items={[{ id: "read", label: "Lire les corrigés", Icon: Eye }, { id: "practice", label: "S'entraîner", Icon: PenLine }]}
            value={mode} onChange={setMode} label={t("Mode")}
          />
          <label className={`flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-full border ${c.border} ${c.card}`}>
            <Search size={15} className={c.faint} aria-hidden="true" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Chercher dans les réponses et les explications…")}
              aria-label={t("Chercher dans les réponses et les explications")}
              className={`flex-1 min-w-0 bg-transparent outline-none text-sm ${c.text}`}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={t("Effacer")} className={c.faint}><X size={14} /></button>
            )}
          </label>
        </div>
        {levels.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap" role="group" aria-label={t("Difficulté")}>
            <span className={`text-xs font-semibold mr-1 ${c.faint}`}>{t("Difficulté")}</span>
            {/* « Toutes » n'est pas un niveau de plus : c'est la remise à zéro. */}
            <button type="button" onClick={() => setLevelIds([])} aria-pressed={levelIds.length === 0}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${levelIds.length === 0 ? `${FILL} border-transparent` : `${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
              {t("Toutes")}
            </button>
            {levels.map((l) => {
              const on = levelIds.includes(l.id);
              return (
                <button type="button" key={l.id} onClick={() => toggleLevel(l.id)} aria-pressed={on}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${on ? `${FILL} border-transparent` : `${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                  {l.label}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-5 items-start">
        {/* ── quiz picker ───────────────────────────────────────────────── */}
        <Card className={`p-4 lg:sticky lg:top-28 ${searching ? "opacity-60" : ""}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${c.faint}`}>
            {searching ? t("Recherche dans tous les quiz") : bank ? `${quizzes.length} ${t("quiz")}` : "…"}
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-5 gap-1.5">
            {quizzes.map((q) => {
              const on = !searching && current?.id === q.id;
              return (
                <button type="button" key={q.id} onClick={() => { setQuizId(q.id); setQuery(""); }} aria-pressed={on}
                  aria-label={`${t("Quiz")} ${q.number ?? "?"}`}
                  className={`h-9 rounded-lg font-mono2 text-xs font-bold transition-colors ${on ? FILL : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                  {String(q.number ?? "?").padStart(2, "0")}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── the deck ──────────────────────────────────────────────────── */}
        {!bank ? <BankLoading error={error} onRetry={retry} /> : <Deck
          key={deckKey}
          questions={deck}
          section={section}
          mode={mode}
          heading={searching
            ? `${results.length} ${t(results.length > 1 ? "questions trouvées" : "question trouvée")}${results.length > SEARCH_LIMIT ? ` · ${t("les")} ${SEARCH_LIMIT} ${t("premières")}` : ""}`
            : `${t("Quiz")} ${current?.number ?? "?"}`}
          onClear={() => { setQuery(""); setLevelIds([]); }}
        />}
      </div>
    </PageShell>
  );
}

// One deck: the questions dealt one at a time. Signing happens here for the
// whole deck (one batched request); the practice answers live here too, so
// they vanish with the deck — nothing in Révision is a record.
function Deck({ questions, section, mode, heading, onClear }) {
  const { c, t } = useApp();
  const signed = useSignedQuestions(questions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const n = signed.length;
  const i = Math.min(index, Math.max(0, n - 1));
  const go = useCallback((d) => setIndex((x) => Math.max(0, Math.min(n - 1, x + d))), [n]);

  // ← / → move through the deck, unless the visitor is typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (n === 0) {
    return (
      <Card className="p-10 text-center">
        <p className={`text-sm ${c.sub}`}>{t("Aucune question ne correspond.")}</p>
        <button type="button" onClick={onClear} className="mt-3 text-sm font-semibold text-blue-600">{t("Effacer les filtres")}</button>
      </Card>
    );
  }

  const q = signed[i];
  const done = Object.keys(answers).length;
  const right = signed.filter((x) => answers[x.id] != null && answers[x.id] === x.a).length;
  // First answer only — this is a rehearsal, not a retry loop.
  const answer = (choice) => setAnswers((prev) => (prev[q.id] != null ? prev : { ...prev, [q.id]: choice }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className={`font-display font-bold ${c.text}`}>
          {heading} <span className={`font-mono2 text-sm font-semibold ${c.faint}`}>· {i + 1} / {n}</span>
        </p>
        {mode === "practice" && done > 0 && (
          <span className="flex items-center gap-3 text-sm">
            <span className={`font-semibold ${c.text}`}>{right} / {done} {t("bonnes réponses")}</span>
            <button type="button" onClick={() => setAnswers({})} className="inline-flex items-center gap-1 font-semibold text-blue-600">
              <RotateCcw size={13} /> {t("Recommencer")}
            </button>
          </span>
        )}
      </div>

      {/* Progress strip: one segment per question, clickable. */}
      <div className="flex gap-1 mb-4" role="group" aria-label={t("Questions")}>
        {signed.map((x, k) => {
          const a = answers[x.id];
          const tone = k === i ? "bg-[var(--tool-fill,#2563EB)]" : a == null ? c.track : a === x.a ? "bg-emerald-500" : "bg-rose-500";
          return (
            <button type="button" key={x.id} onClick={() => setIndex(k)} aria-label={`${t("Question")} ${x.order}`} aria-current={k === i ? "step" : undefined}
              className={`h-2 flex-1 rounded-full transition-colors ${tone} ${k === i ? "" : "hover:opacity-70"}`} />
          );
        })}
      </div>

      <QuestionCard key={q.id} q={q} section={section} mode={mode} chosen={answers[q.id]} onAnswer={answer} />

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(-1)} disabled={i === 0}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-semibold disabled:opacity-40 ${c.border} ${c.card} ${c.text} ${c.hoverSoft}`}>
          <ChevronLeft size={16} /> {t("Précédente")}
        </button>
        <span className={`hidden sm:block text-xs ${c.faint}`}>{t("Flèches ← → du clavier")}</span>
        <button type="button" onClick={() => go(1)} disabled={i === n - 1}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 ${FILL}`}>
          {t("Suivante")} <ChevronRight size={16} />
        </button>
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
    <Card className="p-5 md:p-6 rise">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-mono2 font-semibold ${c.faint}`}>
          {t(SECTION_LABELS[section])} · {t("Quiz")} {q.quizNumber ?? "?"} · Q{q.order}
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
    </Card>
  );
}
