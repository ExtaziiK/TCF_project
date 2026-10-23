import { useEffect, useRef, useState } from "react";
import { PenLine, Send, Loader2, AlertCircle, RotateCcw, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn, TimerChip } from "@/components/common";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { WritingEditor } from "@/components/expression/WritingEditor";
import { evaluateWriting } from "@/services/aiService";
import { countWords } from "@/utils/writingDrafts";
import { levelsFromScore } from "../../../api/_lib/levels.js";

// The Expression écrite of the TCF blanc, run like the real one: the three
// tâches on ONE 60-minute clock, written in any order with free navigation
// between them (nothing is lost), no model answer and no analysis while it
// runs, and everything sent when the time is up — or when the candidate ends
// the épreuve. Then the three texts are graded and the épreuve gets one score
// /20 (with its level and NCLC), followed by the detail per tâche.
//
// The whole attempt (texts, plans, deadline, results) is kept in
// localStorage, so a reload neither loses the texts nor restarts the clock.

export const EE_EXAM_SECS = 60 * 60;
const KEY = (examKey, tasks) => `passerelle.ee.exam.${examKey}|${tasks.map((t) => t.id).join("|")}`;
const load = (key) => { try { return JSON.parse(window.localStorage.getItem(key)) || null; } catch { return null; } };
const store = (key, v) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* kept for this visit only */ } };
const range = (task) => {
  const nums = String(task.words || "").match(/\d+/g)?.map(Number) || [];
  return [nums[0] ?? 0, nums[1] ?? nums[0] ?? 0];
};

export function WritingExamSequence({ tasks, examKey = "" }) {
  const { c, t, lang } = useApp();
  const parts = tasks.filter((tk) => !tk.empty);
  const key = KEY(examKey, parts);
  // phase: lobby | writing | grading | report
  const [state, setState] = useState(() => load(key) || { phase: "lobby", texts: {}, notes: {}, deadline: null, results: {} });
  const [active, setActive] = useState(parts[0]?.task);
  const [now, setNow] = useState(Date.now());
  const [armed, setArmed] = useState(false);
  const submitting = useRef(false);

  const save = (patch) => setState((s) => { const next = { ...s, ...patch }; store(key, next); return next; });
  const left = state.deadline ? Math.max(0, Math.round((state.deadline - now) / 1000)) : EE_EXAM_SECS;

  // The clock, and the automatic submission at 0:00.
  useEffect(() => {
    if (state.phase !== "writing") return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);
  useEffect(() => {
    if (state.phase === "writing" && left === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, left]);
  // A reload in the middle of grading picks the grading up again.
  useEffect(() => {
    if (state.phase === "grading") gradeAll(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  const start = () => save({ phase: "writing", deadline: Date.now() + EE_EXAM_SECS * 1000 });

  // Grades every tâche with a text, one after the other (the endpoint paces
  // calls per account). An empty tâche is not sent: it scores 0.
  const gradeAll = async (s) => {
    if (submitting.current) return;
    submitting.current = true;
    const results = { ...s.results };
    for (const tk of parts) {
      if (results[tk.task]?.feedback) continue;
      const text = (s.texts[tk.task] || "").trim();
      if (!text) { results[tk.task] = { empty: true }; continue; }
      try {
        const feedback = await evaluateWriting({ prompt: tk.prompt, response: text, taskLabel: tk.t || `Tâche ${tk.task}`, task: tk.task, targetWords: tk.words, lang });
        results[tk.task] = { feedback };
      } catch (err) {
        results[tk.task] = { error: err?.message || "failed" };
      }
      save({ results: { ...results } });
    }
    submitting.current = false;
    save({ phase: "report", results });
  };

  function submit() {
    if (state.phase !== "writing") return;
    const next = { ...state, phase: "grading" };
    save({ phase: "grading" });
    gradeAll(next);
  }

  // A tâche whose grading failed (connection, quota): try it again.
  const retry = (task) => {
    const results = { ...state.results };
    delete results[task];
    const next = { ...state, phase: "grading", results };
    save({ phase: "grading", results });
    gradeAll(next);
  };

  if (!parts.length) return null;

  if (state.phase === "lobby") {
    return (
      <Card className="p-7 max-w-2xl mx-auto">
        <h3 className={`font-display font-bold text-xl mb-3 flex items-center gap-2 ${c.text}`}><PenLine size={20} className="text-blue-600" /> {t("Expression écrite : 60 minutes, trois tâches")}</h3>
        <ul className={`space-y-2 text-sm ${c.sub} list-disc list-inside mb-6`}>
          <li>{t("Un seul chronomètre de 60 minutes pour les trois tâches : à vous de répartir votre temps.")}</li>
          <li>{t("Passez librement d'une tâche à l'autre : rien n'est perdu.")}</li>
          <li>{t("Pas de correcteur orthographique, pas d'exemple de réponse, pas d'analyse pendant l'épreuve.")}</li>
          <li>{t("À la fin du temps, vos trois textes sont envoyés automatiquement, terminés ou non.")}</li>
          <li>{t("La correction arrive à la fin : une note globale /20, puis le détail de chaque tâche.")}</li>
        </ul>
        <p className={`text-xs mb-5 ${c.faint}`}>{t("Conseil : environ 10 min pour la tâche 1, 20 min pour la tâche 2, 25 min pour la tâche 3, et 5 min pour vous relire.")}</p>
        <Btn icon={PenLine} onClick={start}>{t("Commencer l'épreuve")}</Btn>
      </Card>
    );
  }

  if (state.phase === "grading") {
    const done = parts.filter((tk) => state.results[tk.task]).length;
    return (
      <Card className="p-7 max-w-2xl mx-auto text-center">
        <Loader2 size={28} className="mx-auto text-blue-600 animate-spin" />
        <p className={`mt-4 font-display font-bold ${c.text}`}>{left === 0 ? t("Temps écoulé : vos textes ont été envoyés.") : t("Épreuve terminée : vos textes ont été envoyés.")}</p>
        <p className={`mt-1 text-sm ${c.sub}`}>{t("Correction en cours…")} {done} / {parts.length}</p>
      </Card>
    );
  }

  if (state.phase === "report") return <WritingExamReport parts={parts} state={state} onRetry={retry} />;

  // Writing.
  const task = parts.find((tk) => tk.task === active) || parts[0];
  const [lo, hi] = range(task);
  const text = state.texts[task.task] || "";
  const setText = (v) => save({ texts: { ...state.texts, [task.task]: v } });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex gap-2 flex-wrap">
          {parts.map((tk) => {
            const w = countWords(state.texts[tk.task]);
            const [a, b] = range(tk);
            return (
              <button key={tk.task} onClick={() => setActive(tk.task)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${active === tk.task ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                {t(tk.t)}
                <span className={`text-xs font-mono2 ${active === tk.task ? "text-white/80" : w >= a && w <= b ? "text-emerald-500" : c.faint}`}>{w}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <TimerChip left={left} total={EE_EXAM_SECS} />
          <button
            type="button"
            onClick={() => (armed ? submit() : setArmed(true))}
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 border transition-colors ${armed ? "border-rose-600 text-rose-600 bg-rose-600/10" : "border-blue-600 text-blue-600 hover:bg-blue-600/10"}`}
          >
            <Send size={14} /> {armed ? t("Confirmer : envoyer les 3 textes") : t("Terminer l'épreuve")}
          </button>
        </div>
      </div>
      <WritingEditor
        key={task.task}
        task={task}
        text={text}
        onTextChange={setText}
        words={countWords(text)}
        lo={lo}
        hi={hi}
      />
    </div>
  );
}

// One Expression écrite score for the épreuve: the three tâches averaged, an
// empty one counting 0, as a missing text would on exam day.
function WritingExamReport({ parts, state, onRetry }) {
  const { c, t } = useApp();
  const failed = parts.filter((tk) => state.results[tk.task]?.error);
  const scores = parts.map((tk) => state.results[tk.task]?.feedback?.score);
  const overall = failed.length ? null : levelsFromScore(scores.reduce((sum, s) => sum + (Number.isFinite(s) ? s : 0), 0) / parts.length);
  const empty = parts.filter((tk) => state.results[tk.task]?.empty);

  return (
    <div className="space-y-5">
      <Card className="p-7 text-center border-2 border-blue-600/40">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">{t("Expression écrite · résultat")}</p>
        {overall ? (
          <>
            <p className={`font-display font-bold text-5xl ${c.text}`}>{overall.score ?? "—"}<span className={`text-2xl ${c.faint}`}> / 20</span></p>
            <p className={`mt-2 text-sm font-semibold ${c.sub}`}>
              {overall.level ? `${t("Niveau")} ${overall.level}` : t("Pas de niveau attribué")}
              {overall.nclc ? ` · NCLC ${overall.nclc}` : ""}
            </p>
          </>
        ) : (
          <p className={`text-sm font-semibold text-amber-600 flex items-center justify-center gap-1.5`}><AlertCircle size={15} /> {t("Une correction n'a pas abouti : relancez-la ci-dessous pour obtenir votre note globale.")}</p>
        )}
        {empty.length > 0 && <p className="mt-3 text-xs font-semibold text-amber-600">{t("Comptée 0, aucun texte rédigé :")} {empty.map((tk) => t(tk.t)).join(", ")}</p>}
        <p className={`mt-3 text-xs ${c.faint}`}>{t("Estimation par l'IA ; le jour de l'examen, deux correcteurs certifiés lisent votre copie.")}</p>
      </Card>
      {parts.map((tk) => {
        const r = state.results[tk.task] || {};
        return (
          <div key={tk.id}>
            <p className={`font-display font-bold mb-2 flex items-center gap-2 ${c.text}`}>
              {r.feedback && <CheckCircle2 size={16} className="text-emerald-500" />} {t(tk.t)}
              <span className={`text-xs font-normal font-mono2 ${c.faint}`}>{countWords(state.texts[tk.task])} {t("mots")}</span>
            </p>
            {r.feedback ? (
              <AiFeedback {...r.feedback} />
            ) : r.error ? (
              <Card className="p-5 flex items-center justify-between gap-3 flex-wrap">
                <p className={`text-sm ${c.sub}`}>{t("La correction de cette tâche n'a pas abouti.")}</p>
                <Btn small variant="ghost" icon={RotateCcw} onClick={() => onRetry(tk.task)}>{t("Relancer la correction")}</Btn>
              </Card>
            ) : (
              <Card className={`p-5 text-sm ${c.sub}`}>{t("Aucun texte rédigé pour cette tâche.")}</Card>
            )}
          </div>
        );
      })}
    </div>
  );
}
