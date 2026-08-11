import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowRight, CheckCircle2, Flag, Sparkles, Lock, Shuffle, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar, AccentKeys, insertAtCaret, NO_ASSIST_PROPS } from "@/components/common";
import { sujetsForTask, RECENT_MONTHS } from "@/services/dicteeService";
import { DicteePlayer } from "@/components/dictee/DicteePlayer";
import { DicteeReport } from "@/components/dictee/DicteeReport";
import { useDictee } from "@/hooks/useDictee";

// La dictée — Expression écrite.
//
// A sujet is drawn from the EE archive, its C1/C2 model answer is read aloud
// one sentence at a time, and the candidate writes down what they hear with no
// help of any kind. It is the only exercise on the site that trains listening
// and spelling in the same movement, and it runs on content the site already
// owns: 476 sujets whose model answers had never been written until now.

const TASKS = [
  { n: 1, label: "Tâche 1", kind: "Message ou lettre", words: "~100 mots", level: "C1" },
  { n: 2, label: "Tâche 2", kind: "Article, courriel ou billet", words: "~140 mots", level: "C1" },
  { n: 3, label: "Tâche 3", kind: "Texte argumenté", words: "~200 mots", level: "C2" },
];

export function Dictee() {
  const { c, t } = useApp();
  const d = useDictee();
  const [task, setTask] = useState(1);
  const [sujetKey, setSujetKey] = useState(null);

  // The sujets on offer for the chosen tâche. Changing tâche clears the
  // selection: a key is only meaningful together with the tâche it was picked
  // under, and silently carrying it over would start a different dictée from
  // the one on screen.
  const choices = useMemo(() => sujetsForTask(d.months || [], task), [d.months, task]);
  const chosen = choices.find((s) => s.key === sujetKey) || null;

  const pickTask = (n) => { setTask(n); setSujetKey(null); };
  const pickRandom = () => {
    if (!choices.length) return d.start(task);
    const from = choices[Math.floor(Math.random() * choices.length)];
    setSujetKey(from.key);
    d.start(task, from.key);
  };

  if (d.phase === "done" && d.summary) {
    return (
      <PageShell back wide eyebrow={t("La dictée")} title={t("Votre dictée, corrigée")} sub={t("Mot à mot, avec la raison de chaque écart.")}>
        <DicteeReport
          dictee={d.dictee}
          summary={d.summary}
          results={d.results}
          plays={d.plays}
          speed={d.speed}
          playsPerSentence={d.playsPerSentence}
          onRestart={pickRandom}
          onNewTask={d.reset}
        />
      </PageShell>
    );
  }

  if (d.phase === "typing" && d.dictee) {
    return <Workspace d={d} />;
  }

  /* ------------------------------- the intro ------------------------------ */
  const best = d.history.length ? Math.max(...d.history.map((s) => s.score)) : null;

  return (
    <PageShell
      back
      eyebrow={t("La dictée")}
      title={t("Écrivez ce que vous entendez")}
      sub={t("Un sujet d'expression écrite des deux derniers mois, son corrigé de niveau C1 ou C2 lu à voix haute, et vous : sans texte, sans correcteur, sans aide.")}
    >
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 md:p-7">
            <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Choisissez la tâche")}</h3>
            <p className={`text-sm mt-1 mb-5 ${c.sub}`}>{t("Puis le sujet, parmi ceux tombés ces deux derniers mois.")}</p>
            <div className="space-y-2.5">
              {TASKS.map((tk) => (
                <button
                  key={tk.n}
                  onClick={() => pickTask(tk.n)}
                  aria-pressed={task === tk.n}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    task === tk.n ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`
                  }`}
                >
                  <span className={`font-display font-bold text-lg shrink-0 ${task === tk.n ? "text-blue-600" : c.faint}`}>{tk.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold text-sm ${c.text}`}>{t(tk.kind)}</span>
                    <span className={`block text-xs ${c.sub}`}>{tk.words}</span>
                  </span>
                  <Pill tone={tk.level === "C2" ? "gold" : "blue"}>{tk.level}</Pill>
                </button>
              ))}
            </div>

            {/* ── the sujets ─────────────────────────────────────────── */}
            <div className={`mt-7 pt-6 border-t ${c.border}`}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
                <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Choisissez le sujet")}</h3>
                {choices.length > 0 && (
                  <span className={`text-xs ${c.faint}`}>
                    {choices.length} {t("sujets")} · {RECENT_MONTHS} {t("derniers mois")}
                  </span>
                )}
              </div>

              {d.months === null ? (
                <p className={`text-sm ${c.faint}`}>{t("Chargement des sujets…")}</p>
              ) : choices.length === 0 ? (
                <p className={`text-sm ${c.sub}`}>{t("Aucun sujet disponible pour cette tâche. Utilisez le tirage au sort.")}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {choices.map((s, i) => {
                    const on = s.key === sujetKey;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSujetKey(s.key)}
                        aria-pressed={on}
                        className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex gap-3 ${
                          on ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`
                        }`}
                      >
                        <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${on ? "bg-blue-600 border-blue-600 text-white" : c.border}`}>
                          {on && <Check size={12} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          {/* Numbered down the list, not by the sujet's number
                              within its month: without the month shown, "sujet 1"
                              would appear twice — once for each of the two
                              months on offer. */}
                          <span className={`block text-[11px] font-semibold uppercase tracking-wide ${c.faint}`}>
                            {t("sujet")} {i + 1}
                          </span>
                          {/* Clamped: a tâche 2 instruction runs to a couple of
                              lines, and a list of full paragraphs is unreadable.
                              The whole sujet is shown in the final report. */}
                          <span className={`block text-sm leading-snug mt-0.5 line-clamp-2 ${c.text}`}>{s.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Btn
                icon={d.phase === "loading" ? undefined : ArrowRight}
                disabled={d.phase === "loading" || (!chosen && choices.length > 0)}
                onClick={() => d.start(task, chosen?.key || null)}
              >
                {d.phase === "loading"
                  ? <><Loader2 size={16} className="animate-spin" /> {t("Préparation de la dictée…")}</>
                  : t("Commencer la dictée")}
              </Btn>
              <Btn variant="ghost" icon={Shuffle} disabled={d.phase === "loading"} onClick={pickRandom}>
                {t("Choisir au hasard")}
              </Btn>
              {d.phase === "loading" && (
                <p className={`text-xs ${c.faint}`}>
                  {t("Si ce sujet n'a jamais été dicté, son corrigé est en train d'être rédigé et enregistré. Une fois seulement.")}
                </p>
              )}
            </div>
            {d.error && <p className="mt-4 text-sm text-rose-600">{d.error}</p>}
          </Card>

          <Card className="p-6">
            <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}>
              <Lock size={15} className="text-blue-600" /> {t("Les règles")}
            </h4>
            <ul className={`text-sm space-y-2 ${c.sub}`}>
              <li>{t("Une phrase à la fois. Réécoutez autant que vous voulez — les écoutes sont comptées, pas limitées.")}</li>
              <li>{t("Le correcteur orthographique, le copier-coller et la saisie automatique sont désactivés.")}</li>
              <li>{t("La ponctuation et les majuscules ne sont pas comptées. Les accents, si : c'est ce qu'un correcteur du TCF regarde.")}</li>
              <li>{t("Vous pouvez arrêter en cours de route : les phrases non faites comptent comme non répondues.")}</li>
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-3">{t("Vos dictées")}</p>
          {d.history.length === 0 ? (
            <p className={`text-sm ${c.sub}`}>{t("Aucune dictée pour l'instant. La première vous dira en une minute si vos erreurs viennent de l'oreille ou du stylo.")}</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-4xl grad-text">{best} %</span>
                <span className={`text-sm ${c.faint}`}>{t("meilleur score")}</span>
              </div>
              <p className={`text-sm mt-1 ${c.sub}`}>
                {d.history.length} {d.history.length > 1 ? t("dictées terminées") : t("dictée terminée")}
              </p>
              <div className={`mt-4 space-y-2 border-t ${c.border} pt-4`}>
                {d.history.slice(0, 5).map((s, i) => (
                  <div key={s.id || i} className="flex items-center justify-between gap-3 text-sm">
                    <span className={c.sub}>
                      {t("Tâche")} {s.task} · {new Date(s.completedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                    </span>
                    <Pill tone={s.score >= 85 ? "green" : s.score >= 60 ? "amber" : "red"}>{s.score} %</Pill>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

/* ------------------------------- the exercise ----------------------------- */

function Workspace({ d }) {
  const { c, t } = useApp();
  const inputRef = useRef(null);

  // Focus follows the exercise: a new sentence puts the cursor where the
  // candidate is about to type, so the whole dictée runs from the keyboard.
  useEffect(() => {
    inputRef.current?.focus();
  }, [d.index]);

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (d.draft.trim()) d.validate();
  };

  const done = d.results.length;

  return (
    <PageShell
      eyebrow={`${t("La dictée")} · ${t("tâche")} ${d.dictee.task}`}
      title={t("Écrivez ce que vous entendez")}
      sub={t("Une phrase à la fois. Rien d'autre à l'écran, c'est voulu.")}
      tight
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <ProgressBar pct={Math.round((done / d.sentenceCount) * 100)} tone="grad" />
          <p className={`mt-2 text-xs ${c.faint}`}>
            {done} / {d.sentenceCount} {t("phrases validées")}
          </p>
        </div>

        <Card className="p-6 md:p-7">
          <DicteePlayer
            index={d.index}
            total={d.sentenceCount}
            plays={d.plays}
            playing={d.playing}
            speed={d.speed}
            setSpeed={d.setSpeed}
            onPlay={d.play}
          />

          <div className={`mt-6 pt-6 border-t ${c.border}`}>
            <label htmlFor="dictee-input" className={`block text-sm font-semibold mb-2 ${c.text}`}>
              {t("Votre transcription")}
            </label>
            <div className={`rounded-2xl border ${c.border} ${c.card} overflow-hidden`}>
                  {/* The same on-screen French keys as the Expression écrite
                      workshop, for candidates without a FR keyboard. In a
                      dictée they are not a convenience but a condition of
                      fairness: the accents are scored, so someone who cannot
                      type "é" would be marked down for their hardware. */}
                  <AccentKeys onInsert={(ch) => insertAtCaret(inputRef, ch, d.draft, d.setDraft)} />
                  <textarea
                    id="dictee-input"
                    ref={inputRef}
                    rows={3}
                    value={d.draft}
                    onChange={(e) => d.setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    // "Sans aide" is the exercise, so every assistance is turned
                    // off — including Grammarly-style extensions, which were
                    // injecting their widget into this very field and would
                    // correct exactly the spelling the dictée exists to measure.
                    {...NO_ASSIST_PROPS}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    placeholder={t("Tapez la phrase que vous venez d'entendre…")}
                    className={`w-full px-5 py-4 bg-transparent ${c.text} text-base leading-relaxed resize-none outline-none`}
                  />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Btn icon={CheckCircle2} disabled={!d.draft.trim()} onClick={d.validate}>
                {d.index + 1 >= d.sentenceCount ? t("Terminer et voir ma correction") : t("Valider la phrase")}
              </Btn>
                  <Btn small variant="ghost" icon={Flag} onClick={d.finish}>{t("Terminer ici")}</Btn>
              <span className={`text-xs ${c.faint}`}>{t("Entrée pour valider")}</span>
            </div>
          </div>
        </Card>

        <p className={`text-xs text-center flex items-center justify-center gap-1.5 ${c.faint}`}>
          <Sparkles size={12} aria-hidden="true" />
          {t("Corrigé de niveau")} {d.dictee.level} · {t("la consigne complète et votre correction vous attendent à la fin")}
        </p>
      </div>
    </PageShell>
  );
}
