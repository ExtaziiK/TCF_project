import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowRight, CheckCircle2, Flag, Sparkles, Lock, Shuffle, Check, Sun, Library, Headphones, Coffee, CalendarDays } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar, AccentKeys, insertAtCaret, NO_ASSIST_PROPS } from "@/components/common";
import { DicteePlayer } from "@/components/dictee/DicteePlayer";
import { DicteeReport } from "@/components/dictee/DicteeReport";
import { SEGMENT_MODES, segmentMode } from "@/utils/dicteeSegments";
import { useDictee } from "@/hooks/useDictee";

// La dictée — Expression écrite.
//
// A sujet is drawn from the EE archive, its C1/C2 model answer is read aloud in
// sense groups, and the candidate writes down what they hear with no help of
// any kind. It is the only exercise on the site that trains listening and
// spelling in the same movement, and it runs on content the site already owns:
// 476 sujets whose model answers had never been written until now.
//
// WHAT IS ON OFFER. Three texts are written every night, one per tâche, and
// every text ever written stays available — so the page leads with today's
// three and keeps the whole accumulated library one scroll below. Both are
// instant. Only "un sujet inédit", which reaches for a sujet nobody has ever
// dictated, costs anything, and the day's remaining budget for those is shown
// on the button rather than discovered by clicking it.

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

  // Everything already written for the chosen tâche, today's three first.
  // Changing tâche clears the selection: a key is only meaningful together with
  // the tâche it was picked under, and silently carrying it over would start a
  // different dictée from the one on screen.
  const featured = useMemo(() => (d.library?.today || []).filter((s) => s.task === task), [d.library, task]);
  const shelf = useMemo(() => (d.library?.library || []).filter((s) => s.task === task), [d.library, task]);
  const chosen = [...featured, ...shelf].find((s) => s.sujetKey === sujetKey) || null;
  const budget = d.library?.budget || null;

  const pickTask = (n) => { setTask(n); setSujetKey(null); };

  const pickRandom = () => {
    const pool = [...featured, ...shelf];
    if (!pool.length) return d.start(task);
    const from = pool[Math.floor(Math.random() * pool.length)];
    setSujetKey(from.sujetKey);
    d.start(task, from.sujetKey);
  };

  // Reaches for a sujet nobody has dictated yet — the one path that spends the
  // day's budget. The server picks it, writes it, records it and keeps it, so
  // what this candidate opens is in everyone else's library a second later.
  const pickFresh = () => { setSujetKey(null); d.start(task); };

  if (d.phase === "done" && d.summary) {
    return (
      <PageShell back wide eyebrow={t("La dictée")} title={t("Votre dictée, corrigée")} sub={t("Mot à mot, avec la raison de chaque écart.")}>
        <DicteeReport
          dictee={d.dictee}
          summary={d.summary}
          results={d.results}
          plays={d.plays}
          speed={d.speed}
          mode={d.mode}
          playsPerSegment={d.playsPerSegment}
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
  const loading = d.phase === "loading";

  return (
    <PageShell
      back
      eyebrow={t("La dictée")}
      title={t("Écrivez ce que vous entendez")}
      sub={t("Un sujet d'expression écrite, son corrigé de niveau C1 ou C2 lu à voix haute, et vous : sans texte, sans correcteur, sans aide.")}
    >
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 md:p-7">
            <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Choisissez la tâche")}</h3>
            <p className={`text-sm mt-1 mb-5 ${c.sub}`}>{t("Puis le sujet, et la longueur que vous voulez entendre d'un coup.")}</p>
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

            {/* ── how much is read at a time ─────────────────────────── */}
            <div className={`mt-7 pt-6 border-t ${c.border}`}>
              <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Longueur d'écoute")}</h3>
              <p className={`text-sm mt-1 mb-4 ${c.sub}`}>
                {t("Le texte est lu par groupes de sens — jamais coupé au milieu d'une idée. Choisissez combien vous en entendez à la fois.")}
              </p>
              <div className="grid sm:grid-cols-3 gap-2.5" role="group" aria-label={t("Longueur d'écoute")}>
                {SEGMENT_MODES.map((m) => {
                  const on = d.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => d.setMode(m.id)}
                      aria-pressed={on}
                      className={`text-left px-4 py-3 rounded-2xl border transition-all ${
                        on ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`
                      }`}
                    >
                      <span className={`block font-semibold text-sm ${on ? "text-blue-600" : c.text}`}>{t(m.label)}</span>
                      <span className={`block text-xs mt-0.5 ${c.sub}`}>{t(m.hint)}</span>
                      <span className={`block text-[11px] mt-1 font-mono2 ${c.faint}`}>{t(m.words)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── the sujets ─────────────────────────────────────────── */}
            <div className={`mt-7 pt-6 border-t ${c.border}`}>
              <h3 className={`font-display font-bold text-lg mb-4 ${c.text}`}>{t("Choisissez le sujet")}</h3>

              {d.library === null ? (
                <p className={`text-sm ${c.faint}`}>{t("Chargement de la bibliothèque…")}</p>
              ) : (
                <div className="space-y-6">
                  <SujetGroup
                    icon={Sun}
                    title={t("La dictée du jour")}
                    note={t("Nouvelles ce matin, les mêmes pour tout le monde.")}
                    items={featured}
                    empty={t("Les textes du jour ne sont pas encore écrits pour cette tâche.")}
                    selected={sujetKey}
                    onSelect={setSujetKey}
                  />
                  <SujetGroup
                    icon={Library}
                    title={t("La bibliothèque")}
                    note={`${shelf.length} ${shelf.length > 1 ? t("dictées déjà écrites") : t("dictée déjà écrite")} · ${t("elles ne disparaissent jamais")}`}
                    items={shelf}
                    empty={t("Rien encore ici : la bibliothèque se remplit de trois textes par nuit.")}
                    selected={sujetKey}
                    onSelect={setSujetKey}
                    scroll
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Btn
                icon={loading ? undefined : ArrowRight}
                disabled={loading || !chosen}
                onClick={() => d.start(task, chosen?.sujetKey || null)}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> {t("Préparation de la dictée…")}</>
                  : t("Commencer la dictée")}
              </Btn>
              <Btn variant="ghost" icon={Shuffle} disabled={loading || !(featured.length || shelf.length)} onClick={pickRandom}>
                {t("Au hasard")}
              </Btn>
            </div>

            {/* ── the one path that costs something ───────────────────── */}
            {budget && (
              <div className={`mt-4 pt-4 border-t ${c.border}`}>
                <Btn
                  small
                  variant="soft"
                  icon={Sparkles}
                  disabled={loading || budget.remaining <= 0}
                  onClick={pickFresh}
                >
                  {t("Dicter un sujet inédit")}
                </Btn>
                <p className={`mt-2 text-xs ${c.faint}`}>
                  {budget.remaining > 0
                    ? `${budget.remaining} ${budget.remaining > 1 ? t("textes inédits restants aujourd'hui") : t("texte inédit restant aujourd'hui")} · ${t("le vôtre rejoint la bibliothèque de tout le monde")}`
                    : t("Les textes inédits du jour sont épuisés. Trois nouveaux arrivent cette nuit — la bibliothèque, elle, reste ouverte.")}
                </p>
              </div>
            )}

            {loading && (
              <p className={`mt-3 text-xs ${c.faint}`}>
                {t("Si ce sujet n'a jamais été dicté, son corrigé est en train d'être rédigé et enregistré. Une fois seulement.")}
              </p>
            )}
            {d.notice && <PlanNotice notice={d.notice} />}
            {d.error && <p className="mt-4 text-sm text-rose-600">{d.error}</p>}
          </Card>

          <Card className="p-6">
            <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}>
              <Lock size={15} className="text-blue-600" /> {t("Les règles")}
            </h4>
            <ul className={`text-sm space-y-2 ${c.sub}`}>
              <li>{t("Un passage à la fois. Réécoutez autant que vous voulez — les écoutes sont comptées, pas limitées.")}</li>
              <li>{t("Le correcteur orthographique, le copier-coller et la saisie automatique sont désactivés.")}</li>
              <li>{t("La ponctuation et les majuscules ne sont pas comptées. Les accents, si : c'est ce qu'un correcteur du TCF regarde.")}</li>
              <li>{t("Vous pouvez arrêter en cours de route : les passages non faits comptent comme non répondus.")}</li>
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
                      {/* The listening length a score was taken at, because a
                          run at "Débutant" and one at "Examen" are not the same
                          exercise and the percentages are not interchangeable. */}
                      {s.segmentMode && <span className={c.faint}> · {t(segmentMode(s.segmentMode).label)}</span>}
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

/* ---------------------------- the plan's limits --------------------------- */

// What the server said when it would not hand out another dictation right now.
// Amber and not rose, because neither case is a fault: one is a forfait's daily
// allowance spent, the other is the site telling someone who has just done five
// dictations on one tâche to go and have a coffee. The wording is the server's
// (api/_lib/dictee-quota.js) — it is the half that knows the plan, the tâche
// and the numbers.
function PlanNotice({ notice }) {
  const { c, t, nav } = useApp();
  const pause = notice.code === "dictee-pause";
  const Icon = pause ? Coffee : CalendarDays;
  return (
    <div className="mt-4 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex gap-3">
      <Icon size={18} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <p className={`text-sm leading-relaxed ${c.text}`}>{notice.message}</p>
        {/* Only on the daily limit: the pause is not something to buy your way
            out of, and offering an upgrade there would turn a piece of study
            advice into a sales pitch. */}
        {!pause && (
          <Btn small variant="ghost" className="mt-3" onClick={() => nav("pricing")}>
            {t("Voir les forfaits")}
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ sujet lists ------------------------------- */

function SujetGroup({ icon: Icon, title, note, items, empty, selected, onSelect, scroll = false }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h4 className={`font-semibold text-sm flex items-center gap-2 ${c.text}`}>
          <Icon size={15} className="text-blue-600" aria-hidden="true" /> {title}
        </h4>
        <span className={`text-xs ${c.faint}`}>{note}</span>
      </div>
      {items.length === 0 ? (
        <p className={`text-sm ${c.sub}`}>{empty}</p>
      ) : (
        <div className={`space-y-2 ${scroll ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
          {items.map((s, i) => {
            const on = s.sujetKey === selected;
            return (
              <button
                key={`${s.sujetKey}:${s.task}`}
                onClick={() => onSelect(s.sujetKey)}
                aria-pressed={on}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex gap-3 ${
                  on ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`
                }`}
              >
                <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${on ? "bg-blue-600 border-blue-600 text-white" : c.border}`}>
                  {on && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] font-semibold uppercase tracking-wide ${c.faint}`}>
                    {t("sujet")} {i + 1} · {s.words} {t("mots")} · {s.level}
                  </span>
                  {/* Clamped: a tâche 2 instruction runs to a couple of lines,
                      and a list of full paragraphs is unreadable. The whole
                      sujet is shown in the final report. */}
                  <span className={`block text-sm leading-snug mt-0.5 line-clamp-2 ${c.text}`}>{s.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- the exercise ----------------------------- */

function Workspace({ d }) {
  const { c, t } = useApp();
  const inputRef = useRef(null);

  // Focus follows the exercise: a new segment puts the cursor where the
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
      sub={t("Un passage à la fois. Rien d'autre à l'écran, c'est voulu.")}
      tight
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <ProgressBar pct={Math.round((done / d.segmentCount) * 100)} tone="grad" />
          <p className={`mt-2 text-xs ${c.faint}`}>
            {done} / {d.segmentCount} {t("passages validés")}
          </p>
        </div>

        <Card className="p-6 md:p-7">
          <DicteePlayer
            index={d.index}
            total={d.segmentCount}
            plays={d.plays}
            playing={d.playing}
            speed={d.speed}
            setSpeed={d.setSpeed}
            onPlay={d.play}
            mode={d.mode}
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
                    placeholder={t("Tapez le passage que vous venez d'entendre…")}
                    className={`w-full px-5 py-4 bg-transparent ${c.text} text-base leading-relaxed resize-none outline-none`}
                  />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Btn icon={CheckCircle2} disabled={!d.draft.trim()} onClick={d.validate}>
                {d.index + 1 >= d.segmentCount ? t("Terminer et voir ma correction") : t("Valider le passage")}
              </Btn>
                  <Btn small variant="ghost" icon={Flag} onClick={d.finish}>{t("Terminer ici")}</Btn>
              <span className={`text-xs ${c.faint}`}>{t("Entrée pour valider")}</span>
            </div>
          </div>
        </Card>

        <p className={`text-xs text-center flex items-center justify-center gap-1.5 ${c.faint}`}>
          <Headphones size={12} aria-hidden="true" />
          {t("Corrigé de niveau")} {d.dictee.level} · {t("la consigne complète et votre correction vous attendent à la fin")}
        </p>
      </div>
    </PageShell>
  );
}
