import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Lightbulb, RotateCcw, CheckCircle2, NotebookPen, Lock, ArrowRight, History, AlertTriangle, PenLine, Volume2, Trash2, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Plus, Clock, Layers, Play } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { listMistakes, setMistakeStatus, clearMistakes, bankQuestionIndex, isDicteeCard, dicteeCardOk, isConjCard, conjCardOk, GUIDE_CLOSED_KEY, GUIDE_FOCUS_KEY } from "@/services/mistakeNotebookService";
import { checkAnswer, isCorrect } from "@/utils/conjugationCheck";
import { ERROR_FAMILIES } from "@/utils/dicteeDiff";
import { speak, stopSpeaking } from "@/utils/speech";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { isStaff, PREMIUM } from "@/auth/rbac";
import { requestOpenQuiz } from "@/utils/openQuizRequest";

// Carnet d'erreurs — every bank question the candidate got wrong or left blank
// (collected by Quiz.jsx), until they say « J'ai compris ».
//
// Two tabs over one table. « À revoir » is the work list; « Compris » is the
// history, kept so the candidate can go back over what they once missed —
// typically the week before the exam. Nothing here is scored: like Révision,
// a retry with the answer one click away says nothing about exam performance.
//
// Free accounts get the first FREE_LIMIT questions of « À revoir »; the rest
// and the history are a paid plan's. Collection itself is never limited, so an
// upgrade opens a notebook that is already full.
const FREE_LIMIT = 10;
const PAGE = 20; // cards rendered (and media signed) at a time

// last_choice: an option index, null = left blank, -1 = answered but the option
// was not recorded (cards loaded from before the notebook existed: the old
// per-question log kept right/wrong, not the choice).
const UNKNOWN_CHOICE = -1;

// « Plus récentes » (one list, newest mistake first) or « Par quiz » (folded
// groups: one per quiz, dictée words by error family). Remembered per device.
// Paid accounts only: a free notebook shows 10 cards, nothing to group.
const VIEW_KEY = "carnet-view";
const storedView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "quiz" ? "quiz" : "recent"; } catch { return "recent"; }
};

// One group per quiz (CO/CE), per error family (dictée) and per tense
// (conjugation). Most cards first, then the most recent mistake, so the
// weakest series lead.
function groupCards(items) {
  const groups = new Map();
  for (const x of items) {
    const key = x.q ? `${x.q.section}:${x.q.quizId}`
      : x.section === "conj" ? `conj:${x.card.detail?.tense || ""}`
        : `dictee:${x.card.detail?.family || "spelling"}`;
    let g = groups.get(key);
    if (!g) {
      g = x.q
        ? { key, kind: "quiz", section: x.q.section, quizId: x.q.quizId, quizNumber: x.q.quizNumber, items: [] }
        : x.section === "conj"
          ? { key, kind: "conj", tense: x.card.detail?.tense || "Conjugaison", items: [] }
          : { key, kind: "dictee", family: x.card.detail?.family || "spelling", items: [] };
      groups.set(key, g);
    }
    g.items.push(x);
  }
  for (const g of groups.values()) {
    if (g.kind === "quiz") g.items.sort((a, b) => a.q.order - b.q.order); // question order inside a quiz
  }
  const latest = (g) => Math.max(...g.items.map((x) => Date.parse(x.card.lastWrongAt) || 0));
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length || latest(b) - latest(a));
}

// The notebook's sources: the two bank épreuves, the dictée and conjugation.
const SOURCE_LABELS = { ...SECTION_LABELS, dictee: "Dictée", conj: "Conjugaison" };

// The last loaded cards, kept for the visit and per account: reopening the
// carnet (its marker in the Pratique notebook) shows them at once, while a
// fresh list loads in the background — instead of a placeholder that pushed
// the page tall and then collapsed it.
let cache = { uid: null, cards: null };

const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });

export function Carnet() {
  const { c, t, role, nav, notify, user } = useApp();
  const staff = isStaff(role);
  const premium = PREMIUM.includes(role);
  const [cards, setCards] = useState(() => (cache.uid === (user?.id ?? null) ? cache.cards : null));
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("to_review");
  const [section, setSection] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [view, setViewState] = useState(storedView);
  const [openGroup, setOpenGroup] = useState(null);
  const setView = (v) => {
    setViewState(v);
    setOpenGroup(null);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ }
  };

  useEffect(() => {
    let live = true;
    listMistakes().then((r) => { if (live) { setCards(r.cards); setMissing(!!r.missing); } });
    return () => { live = false; };
  }, []);
  // Keep the cache in step with every change (loads, moves, clearing).
  useEffect(() => { if (cards) cache = { uid: user?.id ?? null, cards }; }, [cards, user?.id]);

  // The bank questions behind the cards: only the quizzes that hold one are
  // downloaded. Keyed on the question ids, so moving a card between tabs does
  // not refetch anything.
  const bankIds = useMemo(
    () => (cards ? [...new Set(cards.filter((x) => !isDicteeCard(x) && !isConjCard(x)).map((x) => String(x.questionId)))].sort().join(" ") : null),
    [cards]
  );
  const [index, setIndex] = useState(null);
  useEffect(() => {
    if (bankIds === null) return;
    let live = true;
    bankQuestionIndex({ staff, questionIds: bankIds ? bankIds.split(" ") : [] }).then(
      (map) => live && setIndex(map),
      () => live && setIndex(new Map()) // a chunk failed: show the dictée/conjugation cards at least
    );
    return () => { live = false; };
  }, [bankIds, staff]);
  const ready = !!cards && !!index;

  // Cards joined to their bank question. One whose question left the bank (or
  // sits in a quiz under review) is dropped quietly: there is nothing to show.
  const joined = useMemo(() => {
    if (!cards || !index) return [];
    // Dictée cards carry their own content in `detail` and need no lookup.
    return cards
      .map((card) => (isDicteeCard(card) ? { card, section: "dictee", ok: dicteeCardOk(card) }
        : isConjCard(card) ? { card, section: "conj", ok: conjCardOk(card) }
          : { card, q: index.get(card.questionId), section: index.get(card.questionId)?.section, ok: index.has(card.questionId) }))
      .filter((x) => x.ok);
  }, [cards, index]);

  const inSection = (x) => section === "all" || x.section === section;
  const toReview = joined.filter((x) => x.card.status === "to_review");
  const understood = joined.filter((x) => x.card.status === "understood");
  const list = (tab === "to_review" ? toReview : understood).filter(inSection);
  const locked = !premium && (tab === "understood" || list.length > FREE_LIMIT);
  const visible = (premium ? list : tab === "understood" ? [] : list.slice(0, FREE_LIMIT)).slice(0, shown);
  const grouped = premium && view === "quiz";
  const groups = grouped ? groupCards(list) : [];

  // Moves a card between the tabs, at once, and back if the database refuses.
  const move = useCallback(async (card, status) => {
    const prev = card.status;
    setCards((cs) => cs.map((x) => (x.id === card.id ? { ...x, status, relapsed: false, understoodAt: status === "understood" ? new Date().toISOString() : null } : x)));
    const r = await setMistakeStatus(card.id, status);
    if (!r.ok) {
      setCards((cs) => cs.map((x) => (x.id === card.id ? { ...x, status: prev } : x)));
      notify(t("Impossible d'enregistrer, réessayez."));
      return;
    }
    notify(t(status === "understood" ? "Rangée dans « Compris »." : "Remise dans « À revoir »."));
  }, [notify, t]);

  const switchTab = (k) => { setTab(k); setShown(PAGE); setOpenGroup(null); };
  const switchSection = (s) => { setSection(s); setShown(PAGE); setOpenGroup(null); };

  const counts = {
    to_review: toReview.filter(inSection).length,
    understood: understood.filter(inSection).length,
  };

  return (
    <PageShell tone="amber" icon={NotebookPen}
      back wide
      eyebrow={t("Carnet d'erreurs")}
      title={t("Les questions que vous avez manquées")}
      sub={t("Vos erreurs arrivent ici : relisez, réessayez, puis « J'ai compris ».")}
    >
      {missing && (
        <Card className="p-5 mb-5 border-2 border-amber-500/40 text-sm text-amber-700 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {t("Le carnet n'est pas encore activé sur ce serveur.")}
        </Card>
      )}

      <NotebookGuide premium={premium} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className={`inline-flex p-1 rounded-full border ${c.border}`} role="tablist">
          {[
            { k: "to_review", label: "À revoir", Icon: NotebookPen },
            { k: "understood", label: "Compris", Icon: History },
          ].map(({ k, label, Icon }) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${tab === k ? "bg-blue-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}>
              <Icon size={14} aria-hidden="true" /> {t(label)}
              <span className={`text-xs font-mono2 ${tab === k ? "opacity-80" : c.faint}`}>{ready ? counts[k] : "…"}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label={t("Épreuve")}>
          {["all", "co", "ce", "dictee", "conj"].map((s) => (
            <button key={s} onClick={() => switchSection(s)} aria-pressed={section === s}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${section === s ? "border-blue-600 bg-blue-600/10 text-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {s === "all" ? t("Toutes") : t(SOURCE_LABELS[s])}
            </button>
          ))}
        </div>
      </div>

      {cards !== null && cards.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap -mt-2 mb-4">
          {premium ? (
            <div className={`inline-flex p-0.5 rounded-lg border ${c.border}`} role="group" aria-label={t("Affichage")}>
              {[
                { v: "recent", label: "Plus récentes", Icon: Clock },
                // Named after what the groups are under the current filter.
                { v: "quiz", label: section === "dictee" ? "Par type d'erreur" : section === "conj" ? "Par temps" : section === "all" ? "Par thème" : "Par quiz", Icon: Layers },
              ].map(({ v, label, Icon }) => (
                <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${view === v ? "bg-blue-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}>
                  <Icon size={13} aria-hidden="true" /> {t(label)}
                </button>
              ))}
            </div>
          ) : <span />}
          <ClearNotebook onCleared={() => { setCards([]); setShown(PAGE); setOpenGroup(null); }} />
        </div>
      )}

      {!ready ? (
        // Kept short: a tall placeholder made the page jump when it was
        // replaced by a shorter list or the empty state.
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <Card key={i} className={`h-16 animate-pulse ${c.track}`} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyNotebook tab={tab} section={section} anyCard={joined.some(inSection)} />
      ) : grouped ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupAccordion key={g.key} group={g} open={openGroup === g.key}
              onToggle={() => setOpenGroup(openGroup === g.key ? null : g.key)} onMove={move} />
          ))}
        </div>
      ) : (
        <>
          <CardList items={visible} onMove={move} />
          {visible.length < (premium ? list.length : Math.min(list.length, FREE_LIMIT)) && (
            <div className="mt-5 text-center">
              <Btn variant="ghost" onClick={() => setShown((n) => n + PAGE)}>{t("Afficher plus")}</Btn>
            </div>
          )}
        </>
      )}

      {cards !== null && locked && list.length > 0 && (
        <Card className="mt-5 p-6 border-2 border-blue-600/40 text-center">
          <Lock size={22} className="text-blue-600 mx-auto" aria-hidden="true" />
          <p className={`font-display font-bold mt-3 ${c.text}`}>
            {tab === "understood"
              ? `${list.length} ${t(list.length > 1 ? "questions comprises dans votre historique" : "question comprise dans votre historique")}`
              : `${list.length - FREE_LIMIT} ${t(list.length - FREE_LIMIT > 1 ? "autres questions vous attendent" : "autre question vous attend")}`}
          </p>
          <p className={`text-sm mt-1 max-w-md mx-auto ${c.sub}`}>
            {t(tab === "understood"
              ? "L'historique complet est réservé aux abonnés : retrouvez toutes les questions que vous avez manquées puis comprises."
              : `Le compte gratuit affiche vos ${FREE_LIMIT} dernières erreurs. Avec un abonnement, le carnet entier est à vous.`)}
          </p>
          <Btn className="mt-4" icon={ArrowRight} onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
        </Card>
      )}
    </PageShell>
  );
}

// A wrong conjugation answer: the sentence with the right form in its gap,
// what was written, the verb and the tense, and the exercise's explanation.
// « Réessayer » empties the gap and grades the new attempt exactly as the
// exercise did (utils/conjugationCheck.js, accepted variants included).
function ConjCard({ card, onMove }) {
  const { c, t, dark } = useApp();
  const d = card.detail;
  const [retry, setRetry] = useState(false);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState(null); // null | "correct" | "accent" | "wrong"
  const understood = card.status === "understood";
  const hidden = retry && verdict == null;
  const gold = dark ? "text-amber-400" : "text-amber-700";
  const [before, after] = d.s ? d.s.split("___") : [null, null];

  const check = (e) => {
    e.preventDefault();
    if (typed.trim()) setVerdict(checkAnswer(d, typed));
  };

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-mono2 font-semibold ${c.faint}`}>
          {t("Conjugaison")}{d.tense ? ` · ${t(d.tense)}` : ""}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {card.relapsed && <Pill tone="red"><RotateCcw size={11} /> {t("Raté à nouveau")}</Pill>}
          {d.verdict === "accent" && !understood && <Pill tone="amber">{t("Accent")}</Pill>}
          {card.timesWrong > 1 && <Pill tone="slate">{t("Manquée")} {card.timesWrong} {t("fois")}</Pill>}
          {understood && card.understoodAt && <Pill tone="green"><Check size={11} /> {t("Compris le")} {fmtDate(card.understoodAt)}</Pill>}
        </div>
      </div>

      {d.s ? (
        <p className={`text-[15px] leading-[2.4] ${c.text}`}>
          {before}
          <span className="inline-block align-bottom mx-1.5 text-center">
            <span className={`block text-sm font-mono2 font-bold leading-none pb-1 whitespace-nowrap ${gold}`}>{d.inf}</span>
            <span className={`block min-w-[84px] px-2 border-b-2 border-dashed border-blue-500/60 font-semibold leading-snug ${hidden ? c.faint : "text-emerald-600"}`}>
              {hidden ? "…" : d.a}
            </span>
          </span>
          {after}
        </p>
      ) : (
        <p className={`flex items-center gap-2 flex-wrap ${c.text}`}>
          <span className={`font-display font-bold text-lg ${gold}`}>{d.inf}</span>
          <span className={c.faint}>·</span>
          <span className={`font-mono2 text-sm ${c.sub}`}>{d.p}</span>
          <span className={c.faint}>→</span>
          <span className={`font-semibold ${hidden ? c.faint : "text-emerald-600"}`}>{hidden ? "?" : d.a}</span>
        </p>
      )}

      {!hidden && !retry && d.typed && (
        <p className={`mt-2 text-sm ${c.sub}`}>
          {t("Vous aviez écrit :")} <span className="line-through text-rose-600">{d.typed}</span>
        </p>
      )}

      {retry && (
        <form onSubmit={check} className="mt-4 flex items-center gap-2 flex-wrap">
          <input value={typed} onChange={(e) => { setTyped(e.target.value); setVerdict(null); }}
            placeholder={d.p ? `${d.p} …` : t("Votre réponse")} aria-label={t("Écrivez la forme conjuguée")}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className={`flex-1 min-w-[12rem] px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
          <Btn small type="submit" disabled={!typed.trim()}>{t("Vérifier")}</Btn>
        </form>
      )}
      {verdict != null && (
        <p className={`mt-2 text-sm font-semibold ${isCorrect(verdict) ? "text-emerald-600" : verdict === "accent" ? "text-amber-600" : "text-rose-600"}`}>
          {isCorrect(verdict) ? t("Bonne réponse !") : verdict === "accent" ? t("Presque : vérifiez les accents.") : `${t("Pas encore : vous avez écrit")} « ${typed.trim()} ».`}
        </p>
      )}

      {!hidden && d.exp && (
        <p className={`mt-3 flex gap-2 text-sm leading-relaxed ${c.sub}`}>
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{d.exp}</span>
        </p>
      )}

      <div className={`mt-5 pt-4 border-t ${c.border} flex items-center justify-between gap-2 flex-wrap`}>
        <Btn small variant="ghost" icon={PenLine} onClick={() => { setRetry(true); setTyped(""); setVerdict(null); }}>
          {t(retry ? "Recommencer" : "Réessayer")}
        </Btn>
        {understood
          ? <Btn small variant="ghost" icon={RotateCcw} onClick={() => onMove(card, "to_review")}>{t("Remettre à revoir")}</Btn>
          : <Btn small icon={CheckCircle2} onClick={() => onMove(card, "understood")}>{t("J'ai compris")}</Btn>}
      </div>
    </Card>
  );
}

// « Comment ça marche ? » — open on a first visit, then remembered closed on
// this device once the candidate has read it (a per-viewer convenience, so
// localStorage, and the page works the same when storage is blocked). Arriving
// from an « En savoir plus » link opens it and scrolls to it.
function NotebookGuide({ premium }) {
  const { c, t } = useApp();
  const ref = useRef(null);
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(GUIDE_CLOSED_KEY) !== "1"; } catch { return true; }
  });
  useEffect(() => {
    let focus = false;
    try { focus = sessionStorage.getItem(GUIDE_FOCUS_KEY) === "1"; sessionStorage.removeItem(GUIDE_FOCUS_KEY); } catch { /* blocked */ }
    if (focus) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(GUIDE_CLOSED_KEY, next ? "0" : "1"); } catch { /* private mode */ }
  };
  // Four one-liners: the guide is read once, so it has to be skimmable.
  const steps = [
    { Icon: NotebookPen, title: "Tout arrive seul", body: "Vos erreurs de quiz, de TCF blanc, de conjugaison et de dictée s'ajoutent automatiquement." },
    { Icon: Plus, title: "Les questions sans réponse", body: "Ajoutez-les depuis le rapport de fin de quiz, si vous voulez les retravailler." },
    { Icon: PenLine, title: "Revoir et réessayer", body: "La correction et l'explication sur chaque carte ; « Réessayer » pour vous retester." },
    { Icon: CheckCircle2, title: "« J'ai compris »", body: "La carte passe dans « Compris ». Ratée à nouveau, elle revient dans « À revoir »." },
  ];
  return (
    <div ref={ref} className="scroll-mt-24">
    <Card className="mb-6 overflow-hidden">
      <button type="button" onClick={toggle} aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left ${c.hoverSoft}`}>
        <span className={`flex items-center gap-2 font-display font-bold ${c.text}`}>
          <HelpCircle size={18} className="text-blue-600" aria-hidden="true" /> {t("Comment ça marche ?")}
        </span>
        <ChevronDown size={18} className={`${c.faint} transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-1 border-t ${c.border}`}>
          <ol className="mt-4 grid md:grid-cols-2 gap-x-6 gap-y-4">
            {steps.map(({ Icon, title, body }, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${c.text}`}>{i + 1}. {t(title)}</p>
                  <p className={`text-sm mt-0.5 leading-relaxed ${c.sub}`}>{t(body)}</p>
                </div>
              </li>
            ))}
          </ol>
          {!premium && (
            <p className={`mt-5 text-xs ${c.faint}`}>
              {t(`Compte gratuit : seules vos ${FREE_LIMIT} dernières erreurs sont visibles.`)}
            </p>
          )}
        </div>
      )}
    </Card>
    </div>
  );
}

// Typed rather than clicked: it wipes both tabs, history included, and there
// is no undo. Same pattern as account deletion on the profile page.
const CLEAR_WORD = "VIDER";

function ClearNotebook({ onCleared }) {
  const { c, t, user, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => { if (busy) return; setOpen(false); setTyped(""); };
  const confirm = async () => {
    setBusy(true);
    const r = await clearMistakes(user?.id);
    setBusy(false);
    if (!r.ok) return notify(t("Impossible de vider le carnet, réessayez."));
    setOpen(false);
    setTyped("");
    onCleared();
    notify(t("Votre carnet est vide : vos prochaines erreurs y arriveront."));
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 hover:underline">
        <Trash2 size={13} aria-hidden="true" /> {t("Vider mon carnet")}
      </button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="clear-title" onClick={close} className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border ${c.border} ${c.card} p-7 shadow-2xl rise`}>
            <span className="w-14 h-14 rounded-full bg-rose-600/10 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle size={26} /></span>
            <h3 id="clear-title" className={`mt-4 text-center font-display font-bold text-lg ${c.text}`}>{t("Vider votre carnet d'erreurs ?")}</h3>
            <ul className={`mt-3 space-y-1.5 text-sm ${c.sub} list-disc pl-5`}>
              <li>{t("Toutes les questions et tous les mots du carnet sont effacés : « À revoir » et « Compris ».")}</li>
              <li>{t("Vos résultats de quiz et votre progression ne changent pas.")}</li>
              <li>{t("Le carnet repart de zéro : vos prochaines erreurs y seront ajoutées.")}</li>
              <li>{t("C'est définitif.")}</li>
            </ul>
            <label htmlFor="clear-confirm" className={`block mt-4 text-xs font-semibold ${c.sub}`}>
              {t("Pour confirmer, tapez")} <span className="font-mono2 text-rose-600">{CLEAR_WORD}</span>
            </label>
            <input
              id="clear-confirm" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)}
              autoComplete="off" spellCheck={false}
              className={`mt-1.5 w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-rose-600 ${c.inputCls}`}
            />
            <div className="mt-5 flex gap-3">
              <Btn small variant="ghost" className="flex-1" disabled={busy} onClick={close}>{t("Annuler")}</Btn>
              <button
                disabled={busy || typed.trim().toUpperCase() !== CLEAR_WORD} onClick={confirm}
                className="flex-1 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >{t(busy ? "Effacement…" : "Vider mon carnet")}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// A folded group. Its cards mount (and their media is signed) only while it
// is open — what keeps a notebook of several hundred cards quick to open.
function GroupAccordion({ group, open, onToggle, onMove }) {
  const { c, t, nav } = useApp();
  const n = group.items.length;
  const family = group.kind === "dictee" ? ERROR_FAMILIES[group.family] : null;
  const title = group.kind === "quiz"
    ? `${t(SECTION_LABELS[group.section])} · ${t("Quiz")} ${group.quizNumber ?? "?"}`
    : group.kind === "conj" ? `${t("Conjugaison")} · ${t(group.tense)}`
      : `${t("Dictée")} · ${t(family?.label || "Orthographe")}`;
  const redo = () => { requestOpenQuiz(group.quizId); nav("exams"); };
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left ${c.hoverSoft}`}>
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 font-mono2 font-bold text-sm flex items-center justify-center shrink-0">
            {group.kind === "quiz" ? String(group.quizNumber ?? "?").padStart(2, "0") : <PenLine size={16} aria-hidden="true" />}
          </span>
          <span className={`font-display font-bold truncate ${c.text}`}>{title}</span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <Pill tone="slate">{n} {t(group.kind === "dictee" ? (n > 1 ? "mots" : "mot") : group.kind === "conj" ? (n > 1 ? "formes" : "forme") : (n > 1 ? "questions" : "question"))}</Pill>
          <ChevronDown size={18} className={`${c.faint} transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-4 border-t ${c.border}`}>
          {group.kind === "quiz" && group.quizId && (
            <div className={`flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-2.5 rounded-xl ${c.hoverSoft}`}>
              <span className={`text-sm ${c.sub}`}>{t("Refaites la série complète pour voir si ces erreurs sont corrigées.")}</span>
              <Btn small variant="ghost" icon={Play} onClick={redo}>{t("Refaire ce quiz")}</Btn>
            </div>
          )}
          {family && <p className={`text-sm mb-4 ${c.sub}`}>{t(family.hint)}</p>}
          <CardList items={group.items} onMove={onMove} />
        </div>
      )}
    </Card>
  );
}

// What an empty « À revoir » says, per filter: where those mistakes come from,
// and the exercise that produces them.
const EMPTY_COPY = {
  all: { none: "Votre carnet est vide", how: "Vos mauvaises réponses aux quiz, aux TCF blancs, à la dictée et en conjugaison viendront s'ajouter ici.", cta: "Faire un quiz", route: "exams" },
  co: { none: "Aucune erreur en compréhension orale", how: "Les questions manquées dans vos quiz et vos TCF blancs de compréhension orale s'ajouteront ici.", cta: "Faire un quiz", route: "exams" },
  ce: { none: "Aucune erreur en compréhension écrite", how: "Les questions manquées dans vos quiz et vos TCF blancs de compréhension écrite s'ajouteront ici.", cta: "Faire un quiz", route: "exams" },
  dictee: { none: "Aucun mot mal écrit pour l'instant", how: "Les mots que vous entendez bien mais écrivez mal dans une dictée (accents, accords, homophones…) s'ajouteront ici.", cta: "Faire une dictée", route: "dictee" },
  conj: { none: "Aucune erreur de conjugaison pour l'instant", how: "Les formes que vous conjuguez mal dans les exercices et les séries de conjugaison s'ajouteront ici.", cta: "Pratiquer la conjugaison", route: "conjugation" },
};
const ALL_DONE = {
  all: "Toutes vos erreurs sont comprises",
  co: "Toutes vos erreurs de compréhension orale sont comprises",
  ce: "Toutes vos erreurs de compréhension écrite sont comprises",
  dictee: "Tous vos mots mal écrits sont compris",
  conj: "Toutes vos erreurs de conjugaison sont comprises",
};

function EmptyNotebook({ tab, section, anyCard }) {
  const { c, t, nav } = useApp();
  const copy = EMPTY_COPY[section] || EMPTY_COPY.all;
  if (tab === "understood") {
    return (
      <Card className="p-8 text-center">
        <History size={26} className="text-blue-600 mx-auto" aria-hidden="true" />
        <p className={`font-display font-bold mt-3 ${c.text}`}>{t("Rien ici pour l'instant")}</p>
        <p className={`text-sm mt-1 ${c.sub}`}>{t("Les questions que vous marquez « J'ai compris » sont gardées ici, pour les revoir avant l'examen.")}</p>
      </Card>
    );
  }
  return (
    <Card className="p-8 text-center">
      <CheckCircle2 size={28} className="text-emerald-600 mx-auto" aria-hidden="true" />
      <p className={`font-display font-bold mt-3 ${c.text}`}>{t(anyCard ? `${ALL_DONE[section] || ALL_DONE.all} — bravo !` : copy.none)}</p>
      <p className={`text-sm mt-1 max-w-md mx-auto ${c.sub}`}>
        {t(anyCard ? "Elles restent dans l'onglet « Compris » pour les revoir avant l'examen. Chaque nouvelle erreur arrivera ici." : copy.how)}
      </p>
      <Btn className="mt-4" icon={ArrowRight} onClick={() => nav(copy.route)}>{t(copy.cta)}</Btn>
    </Card>
  );
}

// Signs the media of the cards on screen in one batch. The array handed to the
// hook is keyed on the question ids, so moving a card re-signs only when the
// set of questions on screen actually changes.
function CardList({ items, onMove }) {
  const bankItems = items.filter((x) => x.q);
  const key = bankItems.map((x) => x.card.id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => bankItems.map((x) => x.q), [key]);
  const signed = useSignedQuestions(questions);
  const signedById = new Map(bankItems.map((x, i) => [x.card.id, signed[i] || x.q]));
  // A sentence still being read aloud stops when the list goes away.
  useEffect(() => stopSpeaking, []);

  // The cards are a horizontal carousel: one question at a time, swiped (or
  // scrolled sideways) with native scroll snapping, with ← / → buttons, a
  // counter and the arrow keys. A card moved to « Compris » leaves the list
  // and the next one slides into its place.
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const n = items.length;
  const at = Math.min(index, Math.max(0, n - 1));
  const step = () => (ref.current ? ref.current.clientWidth + 16 : 1); // card width + gap-4
  const go = (i) => {
    const to = Math.max(0, Math.min(n - 1, i));
    ref.current?.scrollTo({ left: to * step(), behavior: "smooth" });
    setIndex(to);
  };
  const onScroll = () => { if (ref.current) setIndex(Math.round(ref.current.scrollLeft / step())); };
  const onKeyDown = (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
  };
  const { c, t } = useApp();
  const arrow = `w-9 h-9 grid place-items-center rounded-full border ${c.border} ${c.card} ${c.text} ${c.hoverSoft} disabled:opacity-35 disabled:pointer-events-none`;

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-sm font-mono2 font-semibold tabular-nums shrink-0 ${c.text}`}>{at + 1} / {n}</span>
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${c.track}`} aria-hidden="true">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${((at + 1) / n) * 100}%` }} />
        </div>
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} aria-label={t("Question précédente")} className={arrow}><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => go(at + 1)} disabled={at >= n - 1} aria-label={t("Question suivante")} className={arrow}><ChevronRight size={18} /></button>
      </div>
      <div ref={ref} onScroll={onScroll} tabIndex={0} aria-roledescription="carousel" aria-label={t("Vos questions à revoir")}
        className="flex items-start gap-4 overflow-x-auto snap-x snap-mandatory outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((x, i) => (
          <div key={x.card.id} className="snap-center shrink-0 w-full" aria-hidden={i !== at} role="group" aria-label={`${i + 1} / ${n}`}>
            {x.q
              ? <MistakeCard card={x.card} q={signedById.get(x.card.id)} onMove={onMove} />
              : x.section === "conj"
                ? <ConjCard card={x.card} onMove={onMove} />
                : <DicteeCard card={x.card} onMove={onMove} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lower case, accents kept, apostrophes dropped — the dictée's own "exact"
// comparison (utils/dicteeDiff.js), so a retry is judged the way the dictée was.
const exactWord = (s) => String(s || "").trim().toLowerCase().replace(/['’]/g, "");

// A misspelt dictée word: the right spelling against what was written, inside
// the sentence it was dictated in, with that error family's tip. « Réessayer »
// blanks the word out of the sentence and asks for it again.
function DicteeCard({ card, onMove }) {
  const { c, t } = useApp();
  const d = card.detail;
  const [retry, setRetry] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(null); // null | true | false
  const understood = card.status === "understood";
  const family = ERROR_FAMILIES[d.family];
  const hidden = retry && checked == null;

  const check = (e) => {
    e.preventDefault();
    if (typed.trim()) setChecked(exactWord(typed) === exactWord(d.word));
  };

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-mono2 font-semibold ${c.faint}`}>
          {t("Dictée")}{family ? ` · ${t(family.label)}` : ""}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {card.relapsed && <Pill tone="red"><RotateCcw size={11} /> {t("Raté à nouveau")}</Pill>}
          {card.timesWrong > 1 && <Pill tone="slate">{t("Mal écrit")} {card.timesWrong} {t("fois")}</Pill>}
          {understood && card.understoodAt && <Pill tone="green"><Check size={11} /> {t("Compris le")} {fmtDate(card.understoodAt)}</Pill>}
        </div>
      </div>

      {!hidden && (
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display font-extrabold text-2xl text-emerald-600">{d.word}</span>
          <span className={`text-base line-through ${c.faint}`} title={t("Ce que vous aviez écrit")}>{d.typed}</span>
        </div>
      )}

      <p className={`mt-3 leading-relaxed ${c.text}`}>
        {d.sentence.slice(0, d.start)}
        {hidden
          ? <span className="inline-block min-w-[4rem] border-b-2 border-dashed border-blue-600 mx-0.5">&nbsp;</span>
          : <span className="bg-emerald-500/15 text-emerald-700 rounded px-0.5 font-semibold">{d.sentence.slice(d.start, d.end)}</span>}
        {d.sentence.slice(d.end)}
      </p>

      <button type="button" onClick={() => { stopSpeaking(); speak(d.sentence); }}
        className="mt-3 text-sm font-semibold text-blue-600 flex items-center gap-1.5">
        <Volume2 size={15} aria-hidden="true" /> {t("Écouter la phrase")}
      </button>

      {retry && (
        <form onSubmit={check} className="mt-4 flex items-center gap-2 flex-wrap">
          <input value={typed} onChange={(e) => { setTyped(e.target.value); setChecked(null); }}
            placeholder={t("Écrivez le mot manquant")} aria-label={t("Écrivez le mot manquant")}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className={`flex-1 min-w-[12rem] px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
          <Btn small type="submit" disabled={!typed.trim()}>{t("Vérifier")}</Btn>
        </form>
      )}
      {checked != null && (
        <p className={`mt-2 text-sm font-semibold ${checked ? "text-emerald-600" : "text-rose-600"}`}>
          {checked ? t("Bonne orthographe !") : `${t("Pas encore : vous avez écrit")} « ${typed.trim()} ».`}
        </p>
      )}

      {!hidden && family && (
        <p className={`mt-3 flex gap-2 text-sm leading-relaxed ${c.sub}`}>
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t(family.hint)}</span>
        </p>
      )}

      <div className={`mt-5 pt-4 border-t ${c.border} flex items-center justify-between gap-2 flex-wrap`}>
        <Btn small variant="ghost" icon={PenLine} onClick={() => { setRetry(true); setTyped(""); setChecked(null); }}>
          {t(retry ? "Recommencer" : "Réessayer")}
        </Btn>
        {understood
          ? <Btn small variant="ghost" icon={RotateCcw} onClick={() => onMove(card, "to_review")}>{t("Remettre à revoir")}</Btn>
          : <Btn small icon={CheckCircle2} onClick={() => onMove(card, "understood")}>{t("J'ai compris")}</Btn>}
      </div>
    </Card>
  );
}

function MistakeCard({ card, q, onMove }) {
  const { c, t } = useApp();
  // "correction": their last answer in red, the right one in green.
  // "retry": everything hidden until they choose again.
  const [retry, setRetry] = useState(false);
  const [pick, setPick] = useState(null);
  const revealed = !retry || pick != null;
  const chosen = retry ? pick : card.lastChoice === UNKNOWN_CHOICE ? null : card.lastChoice;
  const stem = /^Compr[ée]hension\s+[ée]crite\s+[–-]/i.test(String(q.q || "")) ? null : q.q;
  const understood = card.status === "understood";

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-mono2 font-semibold ${c.faint}`}>
          {SECTION_LABELS[q.section]} · {t("Quiz")} {q.quizNumber ?? "?"} · Q{q.order}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {card.relapsed && <Pill tone="red"><RotateCcw size={11} /> {t("Raté à nouveau")}</Pill>}
          {card.lastChoice == null && !understood && <Pill tone="amber">{t("Sans réponse")}</Pill>}
          {card.timesWrong > 1 && <Pill tone="slate">{t("Manquée")} {card.timesWrong} {t("fois")}</Pill>}
          {understood && card.understoodAt && <Pill tone="green"><Check size={11} /> {t("Compris le")} {fmtDate(card.understoodAt)}</Pill>}
        </div>
      </div>

      {stem && <p className={`text-sm font-medium mb-3 ${c.text}`}>{stem}</p>}
      <BankQuestionMedia question={q} allowReplay />

      <ul className="mt-4 space-y-2">
        {(q.opts || []).map((o, i) => {
          const tone = !revealed ? "idle" : i === q.a ? "right" : i === chosen ? "wrong" : "dim";
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
              {!revealed
                ? <button type="button" onClick={() => setPick(i)} className={shared}>{body}</button>
                : <div className={shared}>{body}</div>}
            </li>
          );
        })}
      </ul>

      {revealed && retry && (
        <p className={`mt-3 text-sm font-semibold ${pick === q.a ? "text-emerald-600" : "text-rose-600"}`}>
          {t(pick === q.a ? "Bonne réponse !" : "Pas encore : relisez l'explication.")}
        </p>
      )}
      {revealed && !retry && !understood && (
        <p className={`mt-3 text-xs ${c.faint}`}>
          {t(card.lastChoice == null ? "Vous n'aviez pas répondu à cette question."
            : card.lastChoice === UNKNOWN_CHOICE ? "Votre réponse à cette question n'a pas été enregistrée." : "En rouge : votre dernière réponse.")}
        </p>
      )}
      {revealed && q.exp && (
        <p className={`mt-3 flex gap-2 text-sm leading-relaxed rise ${c.sub}`}>
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{q.exp}</span>
        </p>
      )}

      <div className={`mt-5 pt-4 border-t ${c.border} flex items-center justify-between gap-2 flex-wrap`}>
        <Btn small variant="ghost" icon={PenLine} onClick={() => { setRetry(true); setPick(null); }}>
          {t(retry ? "Recommencer" : "Réessayer")}
        </Btn>
        {understood
          ? <Btn small variant="ghost" icon={RotateCcw} onClick={() => onMove(card, "to_review")}>{t("Remettre à revoir")}</Btn>
          : <Btn small icon={CheckCircle2} onClick={() => onMove(card, "understood")}>{t("J'ai compris")}</Btn>}
      </div>
    </Card>
  );
}
