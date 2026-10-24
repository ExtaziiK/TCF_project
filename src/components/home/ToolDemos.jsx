import { useEffect, useRef, useState } from "react";
import { Square, Volume2, ArrowRight, Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DemoSteps } from "@/components/home/DemoSteps";
import { SentenceDiff } from "@/components/dictee/SentenceDiff";
import { diffSentence } from "@/utils/dicteeDiff";
import { speak, stopSpeaking } from "@/utils/speech";

// The landing showcase's hands-on demos for the dictée, vocabulary and
// grammar (the comprehension panels are real bank questions, see
// DemoQuestion*; the two expression panels are demo-only, their mock shows the
// AI correction). Everything here runs in the browser with no account and no
// server call: the dictée is read by the browser's French voice and corrected
// by the real engine (utils/dicteeDiff), and the content is a small fixed set
// so the landing bundle stays light. Each is one run through, with no
// "another one" at the end — the next step is the real tool.
//
// Every screen gets the tool's colours (`ink`, `soft`, `onInk`) and `active`,
// false while its panel is hidden: the showcase keeps hidden panels mounted
// so work in progress survives a look at another tool, so anything that makes
// sound has to stop itself.

export function Frame({ ink, soft, label, children }) {
  const { c } = useApp();
  return (
    <div className={`flex-1 rounded-3xl p-5 md:p-6 ${c.card}`} style={{ boxShadow: `0 0 0 2px ${soft}` }}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{label}</span>
        <span className="flex gap-1.5" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full" style={{ background: soft }} />)}</span>
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ ink, onInk, onClick, icon: Icon, children, disabled, ghost, soft, wide }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`${wide ? "w-full justify-center" : ""} inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={ghost ? { background: soft, color: ink } : { background: ink, color: onInk }}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}

// ── La dictée: listen, type, get the real correction ─────────────────────────

const DICTEE_SENTENCES = [
  "Les candidats qui se sont préparés régulièrement obtiennent de meilleurs résultats.",
  "Depuis son arrivée à Montréal, elle cherche un logement près de son travail.",
  "Nous aurions aimé visiter la ville avant de signer le contrat.",
];

export function DicteeDemo({ ink, soft, onInk, active }) {
  const { t, c } = useApp();
  const [n] = useState(() => Math.floor(Math.random() * DICTEE_SENTENCES.length));
  const [typed, setTyped] = useState("");
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [noVoice, setNoVoice] = useState(false);
  const [diff, setDiff] = useState(null);
  const cancelled = useRef(false);
  const sentence = DICTEE_SENTENCES[n];

  const halt = () => { cancelled.current = true; stopSpeaking(); setPlaying(false); };
  useEffect(() => { if (!active) halt(); }, [active]);
  useEffect(() => () => stopSpeaking(), []);

  const play = () => {
    cancelled.current = false;
    setPlaying(true);
    setPlays((p) => p + 1);
    speak(sentence, (spoken) => {
      setPlaying(false);
      if (!spoken && !cancelled.current) setNoVoice(true);
    }, { rateScale: 0.85 });
  };
  const check = () => { halt(); setDiff(diffSentence(sentence, typed)); };
  const score = diff ? Math.round((diff.ok / diff.total) * 100) : 0;

  return (
    <Frame ink={ink} soft={soft} label="LA DICTÉE · PHRASE 1">
      <DemoSteps ink={ink} onInk={onInk} steps={["Écoutez la phrase", "Écrivez-la", "Corrigez"]} done={!!diff} />
      <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: soft }}>
        <button type="button" onClick={playing ? halt : play} aria-label={playing ? t("Arrêter") : t("Écouter la phrase")}
          className="relative grid place-items-center w-11 h-11 rounded-full shrink-0 transition hover:scale-105" style={{ background: ink, color: onInk }}>
          {playing && <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: ink }} />}
          {playing ? <Square size={16} fill="currentColor" /> : <Volume2 size={18} />}
        </button>
        <span className={`text-sm font-semibold ${c.text}`}>
          {playing ? t("Lecture en cours…") : plays ? `${t("Écoutée")} ${plays}× · ${t("réécoutez autant que nécessaire")}` : t("Cliquez pour écouter la phrase")}
        </span>
      </div>
      {noVoice && <p className="mt-2 text-xs text-amber-600">{t("Aucune voix française sur ce navigateur : la lecture est indisponible ici.")}</p>}
      {diff ? (
        <div className="rise mt-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className={`text-sm font-bold ${c.text}`}>{t("Correction")}</span>
            <span className="font-display font-extrabold text-2xl" style={{ color: ink }}>{score} %</span>
          </div>
          <SentenceDiff diff={diff} className="text-sm md:text-base" />
        </div>
      ) : (
        <>
          <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={2} lang="fr" spellCheck={false} autoCorrect="off" autoCapitalize="off"
            placeholder={t("Écrivez ce que vous entendez…")} aria-label={t("Votre dictée")}
            className={`mt-3 w-full resize-none rounded-2xl border px-4 py-3 font-mono2 text-sm leading-relaxed outline-none ${c.inputCls}`}
            style={{ borderColor: soft }} />
          <div className="mt-3"><ActionBtn ink={ink} onInk={onInk} icon={Check} onClick={check} disabled={!typed.trim()}>{t("Corriger")}</ActionBtn></div>
        </>
      )}
    </Frame>
  );
}

// ── Vocabulaire: a short deck of flashcards ──────────────────────────────────

const VOCAB = [
  { fr: "un permis de travail", def: "Document autorisant un étranger à occuper un emploi au Canada.", ex: "Elle a reçu son permis de travail ouvert en mars." },
  { fr: "un dossier", def: "Ensemble des documents réunis pour une démarche.", ex: "Son dossier d'immigration est enfin complet." },
  { fr: "une demande", def: "Démarche officielle pour obtenir un statut ou un service.", ex: "Sa demande de résidence a été acceptée." },
  { fr: "un formulaire", def: "Document à remplir avec ses renseignements.", ex: "Chaque formulaire doit être signé et daté." },
  { fr: "un permis d'études", def: "Document autorisant un étranger à étudier au Canada.", ex: "Le permis d'études couvre toute la durée du programme." },
];

export function VocabDemo({ ink, soft, onInk }) {
  const { t, c } = useApp();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const finished = i >= VOCAB.length;
  const card = VOCAB[i];
  const next = (knew) => { if (knew) setKnown((k) => k + 1); setFlipped(false); setI((x) => x + 1); };
  return (
    <Frame ink={ink} soft={soft} label={`THÈME · IMMIGRATION · ${Math.min(i + 1, VOCAB.length)} / ${VOCAB.length}`}>
      <DemoSteps ink={ink} onInk={onInk} steps={["Retournez la carte", "Dites si vous le saviez"]} done={finished} />
      {finished ? (
        <div className="rise text-center py-6">
          <p className="font-display font-extrabold text-3xl" style={{ color: ink }}>{known} / {VOCAB.length}</p>
          <p className={`mt-1 text-sm ${c.sub}`}>{t("mots connus. Les autres reviendront dans vos révisions.")}</p>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={t("Retourner la carte")}
            className={`w-full min-h-[9rem] rounded-2xl grid place-items-center text-center px-4 py-5 transition hover:-translate-y-0.5 ${c.card}`}
            style={{ boxShadow: `0 0 0 2px ${ink}` }}>
            {flipped ? (
              <span key="back" className="rise">
                <span className={`block text-sm font-semibold ${c.text}`}>{card.def}</span>
                <span className={`block mt-2 text-xs italic ${c.faint}`}>« {card.ex} »</span>
              </span>
            ) : (
              <span key="front">
                <span className="block font-display font-extrabold text-xl" style={{ color: ink }}>{card.fr}</span>
                <span className={`block mt-2 text-xs ${c.faint}`}>{t("Cliquez pour voir la définition")}</span>
              </span>
            )}
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionBtn ink={ink} soft={soft} ghost wide icon={X} onClick={() => next(false)} disabled={!flipped}>{t("À revoir")}</ActionBtn>
            <ActionBtn ink={ink} onInk={onInk} wide icon={Check} onClick={() => next(true)} disabled={!flipped}>{t("Je sais")}</ActionBtn>
          </div>
        </>
      )}
    </Frame>
  );
}

// ── Grammaire: three questions, each with its rule ───────────────────────────

const GRAMMAR = [
  { q: ["Il faut que tu ", " demain."], opts: ["viens", "viennes", "viendras", "venir"], a: 1,
    rule: "Après « il faut que », le verbe se met au subjonctif." },
  { q: ["Si j'avais plus de temps, je ", " le français tous les jours."], opts: ["étudie", "étudierai", "étudierais", "étudiais"], a: 2,
    rule: "Si + imparfait, puis conditionnel présent pour la conséquence." },
  { q: ["C'est la ville ", " je suis né."], opts: ["que", "qui", "dont", "où"], a: 3,
    rule: "« Où » reprend un complément de lieu ou de temps." },
];

export function GrammarDemo({ ink, soft, onInk }) {
  const { t, c } = useApp();
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const finished = i >= GRAMMAR.length;
  const q = GRAMMAR[i];
  const pick = (k) => { if (sel !== null) return; setSel(k); if (k === q.a) setScore((s) => s + 1); };
  const next = () => { setSel(null); setI((x) => x + 1); };
  return (
    <Frame ink={ink} soft={soft} label={`EXERCICE · ${Math.min(i + 1, GRAMMAR.length)} / ${GRAMMAR.length}`}>
      <DemoSteps ink={ink} onInk={onInk} steps={["Choisissez la bonne forme", "Lisez la règle"]} done={finished} />
      {finished ? (
        <div className="rise text-center py-6">
          <p className="font-display font-extrabold text-3xl" style={{ color: ink }}>{score} / {GRAMMAR.length}</p>
          <p className={`mt-1 text-sm ${c.sub}`}>{t("bonnes réponses. Chaque leçon a ses exercices, du subjonctif aux pronoms relatifs.")}</p>
        </div>
      ) : (
        <>
          <p className={`text-base font-semibold ${c.text}`}>
            {q.q[0]}
            <span className="inline-block min-w-[5.5rem] border-b-2 text-center font-bold" style={{ borderColor: ink, color: ink }}>
              {sel !== null ? q.opts[q.a] : "…"}
            </span>
            {q.q[1]}
          </p>
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            {q.opts.map((o, k) => {
              const state = sel === null ? "idle" : k === q.a ? "right" : k === sel ? "wrong" : "dim";
              return (
                <button key={o} type="button" onClick={() => pick(k)} disabled={sel !== null}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-left transition ${state === "idle" ? "hover:-translate-y-0.5" : ""} ${state === "dim" ? "opacity-40" : ""}`}
                  style={state === "right" ? { background: "#10B981", color: "#FFFFFF" } : state === "wrong" ? { background: "#D8354A", color: "#FFFFFF" } : { background: soft, color: ink }}>
                  <span className="w-5 text-xs font-bold opacity-80">{"ABCD"[k]}</span>
                  <span className="flex-1">{o}</span>
                  {state === "right" && <Check size={15} />}
                  {state === "wrong" && <X size={15} />}
                </button>
              );
            })}
          </div>
          {sel !== null && (
            <div className="rise mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: soft }}>
              <span className={c.text}><strong style={{ color: ink }}>{t("Règle")} :</strong> {q.rule}</span>
              <ActionBtn ink={ink} onInk={onInk} icon={ArrowRight} onClick={next}>{t(i + 1 < GRAMMAR.length ? "Suivante" : "Voir le score")}</ActionBtn>
            </div>
          )}
        </>
      )}
    </Frame>
  );
}
