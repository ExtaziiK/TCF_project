import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, RotateCcw, ArrowRight, Check, X, Eye, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DemoSteps } from "@/components/home/DemoSteps";
import { SentenceDiff } from "@/components/dictee/SentenceDiff";
import { diffSentence } from "@/utils/dicteeDiff";
import { speak, stopSpeaking } from "@/utils/speech";

// The landing showcase's hands-on demos, one per tool besides the two
// comprehension panels (those are real bank questions, see DemoQuestion*).
// Everything here runs in the browser with no account and no server call: the
// writing and speaking demos stop short of the AI analysis (which needs an
// account), the dictée is read by the browser's French voice and corrected by
// the real engine (utils/dicteeDiff), and the content is a small fixed set so
// the landing bundle stays light.
//
// Every screen gets the tool's colours (`ink`, `soft`, `onInk`) and `active`,
// false while its panel is hidden: the showcase keeps hidden panels mounted
// so work in progress survives a look at another tool, so anything that makes
// sound has to stop itself.

export function Frame({ ink, soft, label, children }) {
  const { c } = useApp();
  return (
    <div className={`rounded-3xl p-5 md:p-6 ${c.card}`} style={{ boxShadow: `0 0 0 2px ${soft}` }}>
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

function Reveal({ ink, soft, label, children }) {
  const { t, c } = useApp();
  const [open, setOpen] = useState(false);
  return open ? (
    <div className={`rise mt-4 rounded-2xl p-4 text-sm leading-relaxed ${c.sub}`} style={{ background: soft }}>
      <p className="font-bold mb-1" style={{ color: ink }}>{t(label)}</p>
      {children}
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold hover:underline" style={{ color: ink }}>
      <Eye size={15} /> {t(label)}
    </button>
  );
}

// ── Expression écrite: write against the live word counter ───────────────────

const EE_MIN = 60;
const EE_MAX = 120;
const EE_EXAMPLE = "Salut Julie ! Ça y est, je suis installée dans mon nouvel appartement à Rosemont. Le quartier est calme et très vert : il y a un grand parc à deux rues de chez moi, où les familles se promènent le soir. Je fais mes courses au marché Jean-Talon, à dix minutes à pied, et la station de métro est juste à côté. Les voisins sont accueillants. Viens me voir le mois prochain, je te ferai visiter ! Bises, Amina";

export function WriteDemo({ ink, soft, onInk }) {
  const { t, c } = useApp();
  const [text, setText] = useState("");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ok = words >= EE_MIN && words <= EE_MAX;
  const over = words > EE_MAX;
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 1 · MESSAGE">
      <DemoSteps ink={ink} onInk={onInk} steps={["Lisez le sujet", "Écrivez entre 60 et 120 mots"]} done={ok} />
      <p className={`text-sm font-semibold leading-relaxed ${c.text}`}>
        Vous venez d'emménager à Montréal. Écrivez un message à une amie pour lui décrire votre nouveau quartier.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} lang="fr" spellCheck={false}
        placeholder={t("Commencez à écrire ici…")} aria-label={t("Votre réponse")}
        className={`mt-3 w-full resize-y rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none ${c.inputCls}`}
        style={{ borderColor: soft }} />
      <div className="mt-2 flex items-center justify-between font-mono2 text-xs font-semibold" style={{ color: over ? "#D8354A" : ink }}>
        <span>{words} / {EE_MIN}–{EE_MAX} {t("mots")}</span>
        <span>{ok ? `✓ ${t("longueur atteinte")}` : over ? t("trop long") : ""}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: soft }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (words / EE_MAX) * 100)}%`, background: over ? "#D8354A" : ink }} />
      </div>
      <Reveal ink={ink} soft={soft} label="Voir un exemple de réponse">{EE_EXAMPLE}</Reveal>
      <p className={`mt-3 text-xs ${c.faint}`}>{t("Avec un compte gratuit, l'IA évalue votre texte : niveau CECRL, erreurs à corriger et version réécrite.")}</p>
    </Frame>
  );
}

// ── Expression orale: record yourself, listen back ───────────────────────────

const EO_MAX_S = 60;

// Records from the microphone into a local blob URL. Nothing is uploaded.
function useRecorder(maxS) {
  const [state, setState] = useState("idle"); // idle | asking | rec | done | denied | unsupported
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState(null);
  const rec = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const urlRef = useRef(null);

  const release = () => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  };
  const stop = () => { if (rec.current?.state === "recording") rec.current.stop(); };
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") { setState("unsupported"); return; }
    setState("asking");
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setState("denied"); return; }
    const chunks = [];
    const r = new window.MediaRecorder(stream.current);
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      release();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
      setUrl(urlRef.current);
      setState("done");
    };
    rec.current = r;
    r.start();
    setSecs(0);
    setState("rec");
    timer.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
  };

  useEffect(() => { if (secs >= maxS) stop(); }, [secs, maxS]);
  // Unmount: drop the microphone and the blob without touching state.
  useEffect(() => () => {
    if (rec.current?.state === "recording") { rec.current.onstop = null; rec.current.stop(); }
    release();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return { state, secs, url, start, stop };
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function SpeakDemo({ ink, soft, onInk, active }) {
  const { t, c } = useApp();
  const { state, secs, url, start, stop } = useRecorder(EO_MAX_S);
  const recording = state === "rec";
  // Switching to another tool ends the recording.
  useEffect(() => { if (!active) stop(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Frame ink={ink} soft={soft} label="TÂCHE 1 · ENTRETIEN">
      <DemoSteps ink={ink} onInk={onInk} steps={["Enregistrez votre réponse", "Réécoutez-vous"]} done={state === "done"} />
      <p className={`text-sm font-semibold leading-relaxed ${c.text}`}>
        Présentez-vous : parlez de votre parcours, de votre travail et de votre projet au Canada.
      </p>
      <div className="mt-4 flex flex-col items-center">
        <button type="button" onClick={recording ? stop : start} disabled={state === "asking"}
          aria-label={recording ? t("Arrêter l'enregistrement") : t("Lancer l'enregistrement")}
          className="relative grid place-items-center w-20 h-20 rounded-full transition hover:scale-105"
          style={{ background: recording ? "#D8354A" : ink, color: recording ? "#FFFFFF" : onInk }}>
          {recording && <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: "#D8354A" }} />}
          {state === "asking" ? <Loader2 size={28} className="animate-spin" /> : recording ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
        </button>
        <span className="mt-3 font-mono2 text-2xl font-bold tabular-nums" style={{ color: ink }}>
          {recording && <span className="rec-dot inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: "#D8354A" }} />}
          {mmss(secs)} <span className={`text-sm ${c.faint}`}>/ {mmss(EO_MAX_S)}</span>
        </span>
        <p className={`mt-1 text-xs text-center ${c.faint}`}>
          {state === "denied" ? t("Micro refusé : autorisez-le dans votre navigateur pour vous enregistrer.")
            : state === "unsupported" ? t("Votre navigateur ne permet pas d'enregistrer ici.")
            : recording ? t("Parlez… cliquez sur le carré pour arrêter.")
            : t("Cliquez sur le micro. L'enregistrement reste sur votre appareil.")}
        </p>
        {url && !recording && <audio src={url} controls className="mt-3 w-full" />}
      </div>
      <Reveal ink={ink} soft={soft} label="Voir un exemple de réponse">
        Je m'appelle Karim, j'ai trente-deux ans et je suis ingénieur civil. J'ai travaillé six ans à Alger dans une entreprise de construction, où je supervisais des chantiers. Aujourd'hui, je prépare mon installation au Québec : j'aimerais y poursuivre ma carrière et faire venir ma famille…
      </Reveal>
    </Frame>
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
  const [n, setN] = useState(() => Math.floor(Math.random() * DICTEE_SENTENCES.length));
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
  const another = () => {
    halt();
    setN((i) => (i + 1) % DICTEE_SENTENCES.length);
    setTyped(""); setPlays(0); setDiff(null); setNoVoice(false);
  };
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
          <div className="mt-4"><ActionBtn ink={ink} onInk={onInk} icon={RotateCcw} onClick={another}>{t("Une autre phrase")}</ActionBtn></div>
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
  const restart = () => { setI(0); setKnown(0); setFlipped(false); };
  return (
    <Frame ink={ink} soft={soft} label={`THÈME · IMMIGRATION · ${Math.min(i + 1, VOCAB.length)} / ${VOCAB.length}`}>
      <DemoSteps ink={ink} onInk={onInk} steps={["Retournez la carte", "Dites si vous le saviez"]} done={finished} />
      {finished ? (
        <div className="rise text-center py-6">
          <p className="font-display font-extrabold text-3xl" style={{ color: ink }}>{known} / {VOCAB.length}</p>
          <p className={`mt-1 text-sm ${c.sub}`}>{t("mots connus. Les autres reviendront dans vos révisions.")}</p>
          <div className="mt-4"><ActionBtn ink={ink} onInk={onInk} icon={RotateCcw} onClick={restart}>{t("Recommencer")}</ActionBtn></div>
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
  const restart = () => { setI(0); setSel(null); setScore(0); };
  return (
    <Frame ink={ink} soft={soft} label={`EXERCICE · ${Math.min(i + 1, GRAMMAR.length)} / ${GRAMMAR.length}`}>
      <DemoSteps ink={ink} onInk={onInk} steps={["Choisissez la bonne forme", "Lisez la règle"]} done={finished} />
      {finished ? (
        <div className="rise text-center py-6">
          <p className="font-display font-extrabold text-3xl" style={{ color: ink }}>{score} / {GRAMMAR.length}</p>
          <p className={`mt-1 text-sm ${c.sub}`}>{t("bonnes réponses. Chaque leçon a ses exercices, du subjonctif aux pronoms relatifs.")}</p>
          <div className="mt-4"><ActionBtn ink={ink} onInk={onInk} icon={RotateCcw} onClick={restart}>{t("Recommencer")}</ActionBtn></div>
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
