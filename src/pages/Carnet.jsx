import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Lightbulb, RotateCcw, CheckCircle2, NotebookPen, Lock, ArrowRight, History, AlertTriangle, PenLine, Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { listMistakes, setMistakeStatus, bankQuestionIndex, isDicteeCard, dicteeCardOk } from "@/services/mistakeNotebookService";
import { ERROR_FAMILIES } from "@/utils/dicteeDiff";
import { speak, stopSpeaking } from "@/utils/speech";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { isStaff, PREMIUM } from "@/auth/rbac";

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

const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });

export function Carnet() {
  const { c, t, role, nav, notify } = useApp();
  const staff = isStaff(role);
  const premium = PREMIUM.includes(role);
  const [cards, setCards] = useState(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("to_review");
  const [section, setSection] = useState("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    listMistakes().then((r) => { if (live) { setCards(r.cards); setMissing(!!r.missing); } });
    return () => { live = false; };
  }, []);

  // Cards joined to their bank question. One whose question left the bank (or
  // sits in a quiz under review) is dropped quietly: there is nothing to show.
  const joined = useMemo(() => {
    if (!cards) return [];
    const index = bankQuestionIndex({ staff });
    // Dictée cards carry their own content in `detail` and need no lookup.
    return cards
      .map((card) => (isDicteeCard(card)
        ? { card, section: "dictee", ok: dicteeCardOk(card) }
        : { card, q: index.get(card.questionId), section: index.get(card.questionId)?.section, ok: index.has(card.questionId) }))
      .filter((x) => x.ok);
  }, [cards, staff]);

  const inSection = (x) => section === "all" || x.section === section;
  const toReview = joined.filter((x) => x.card.status === "to_review");
  const understood = joined.filter((x) => x.card.status === "understood");
  const list = (tab === "to_review" ? toReview : understood).filter(inSection);
  const locked = !premium && (tab === "understood" || list.length > FREE_LIMIT);
  const visible = (premium ? list : tab === "understood" ? [] : list.slice(0, FREE_LIMIT)).slice(0, shown);

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

  const switchTab = (k) => { setTab(k); setShown(PAGE); };
  const switchSection = (s) => { setSection(s); setShown(PAGE); };

  const counts = {
    to_review: toReview.filter(inSection).length,
    understood: understood.filter(inSection).length,
  };

  return (
    <PageShell
      back wide
      eyebrow={t("Carnet d'erreurs")}
      title={t("Les questions que vous avez manquées")}
      sub={t("Chaque question ratée ou laissée sans réponse dans un quiz ou un TCF blanc, et chaque mot mal écrit dans une dictée, arrive ici. Relisez la correction, réessayez, puis cliquez sur « J'ai compris ».")}
    >
      {missing && (
        <Card className="p-5 mb-5 border-2 border-amber-500/40 text-sm text-amber-700 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {t("Le carnet n'est pas encore activé sur ce serveur.")}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className={`inline-flex p-1 rounded-full border ${c.border}`} role="tablist">
          {[
            { k: "to_review", label: "À revoir", Icon: NotebookPen },
            { k: "understood", label: "Compris", Icon: History },
          ].map(({ k, label, Icon }) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${tab === k ? "bg-blue-600 text-white" : `${c.sub} ${c.hoverSoft}`}`}>
              <Icon size={14} aria-hidden="true" /> {t(label)}
              <span className={`text-xs font-mono2 ${tab === k ? "opacity-80" : c.faint}`}>{cards ? counts[k] : "…"}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label={t("Épreuve")}>
          {["all", "co", "ce", "dictee"].map((s) => (
            <button key={s} onClick={() => switchSection(s)} aria-pressed={section === s}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${section === s ? "border-blue-600 bg-blue-600/10 text-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {s === "all" ? t("Toutes") : s === "dictee" ? t("Dictée") : t(SECTION_LABELS[s])}
            </button>
          ))}
        </div>
      </div>

      {cards === null ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => <Card key={i} className={`h-48 animate-pulse ${c.track}`} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyNotebook tab={tab} anyCard={joined.length > 0} />
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

function EmptyNotebook({ tab, anyCard }) {
  const { c, t, nav } = useApp();
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
      <p className={`font-display font-bold mt-3 ${c.text}`}>{t(anyCard ? "Tout est compris, bravo !" : "Votre carnet est vide")}</p>
      <p className={`text-sm mt-1 max-w-md mx-auto ${c.sub}`}>
        {t(anyCard
          ? "Chaque nouvelle erreur dans un quiz ou un TCF blanc viendra s'ajouter ici."
          : "Faites un quiz de compréhension orale ou écrite ou une dictée : vos erreurs s'ajouteront ici automatiquement.")}
      </p>
      <Btn className="mt-4" icon={ArrowRight} onClick={() => nav("exams")}>{t("Faire un quiz")}</Btn>
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
  return (
    <div className="space-y-4">
      {items.map((x) => (x.q
        ? <MistakeCard key={x.card.id} card={x.card} q={signedById.get(x.card.id)} onMove={onMove} />
        : <DicteeCard key={x.card.id} card={x.card} onMove={onMove} />))}
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
