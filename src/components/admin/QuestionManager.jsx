import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Copy, Archive, ArchiveRestore, Eye, EyeOff, Search,
  X, Upload, Download, History, RotateCcw, AlertTriangle, CloudOff, PlayCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import {
  QUESTION_SECTIONS, QUESTION_STATUSES, SORT_OPTIONS, PAGE_SIZES,
  sectionById, validateQuestion, emptyQuestion,
} from "@/constants/questionSchema";
import {
  listQuestions, createQuestion, updateQuestion, deleteQuestions, patchQuestions,
  duplicateQuestions, listVersions, rollbackQuestion, uploadMedia, syncSiteContent,
} from "@/services/questionsService";
import { getAnalytics } from "@/services/questionAnalyticsService";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");
const fmtMs = (ms) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);
const previewText = (q) => {
  const s = sectionById(q.section);
  return String(q.payload?.[s?.kind === "prompt" ? "prompt" : "q"] || "").slice(0, 70);
};
const statusOf = (id) => QUESTION_STATUSES.find((s) => s.id === id) || QUESTION_STATUSES[0];

/* ------------------------------ modal shell ------------------------------ */

function Modal({ title, onClose, children, wide }) {
  const { c } = useApp();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-14 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <Card className={`relative w-full ${wide ? "max-w-3xl" : "max-w-xl"} p-6 md:p-7 rise max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-display font-bold text-lg ${c.text}`}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className={`p-2 rounded-full ${c.hoverSoft} ${c.faint}`}><X size={17} /></button>
        </div>
        {children}
      </Card>
    </div>
  );
}

/* ------------------------------- analytics ------------------------------- */

// Real per-question stats (from question_attempts). Self-fetching so both the
// preview modal and any future surface can drop it in with just an id.
function QuestionStats({ questionId }) {
  const { c } = useApp();
  const [stat, setStat] = useState(null);
  useEffect(() => {
    let live = true;
    getAnalytics([questionId]).then((m) => { if (live) setStat(m[questionId]); });
    return () => { live = false; };
  }, [questionId]);
  if (!stat) return null;
  const tiles = [
    { label: "Tentatives", value: stat.attempts },
    { label: "Réussite", value: stat.successRate == null ? "—" : `${stat.successRate} %` },
    { label: "Abandon", value: stat.skipRate == null ? "—" : `${stat.skipRate} %` },
    { label: "Temps moyen", value: fmtMs(stat.avgMs) },
  ];
  return (
    <div className={`rounded-2xl border ${c.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-bold uppercase tracking-wider ${c.faint}`}>Statistiques</p>
        {stat.difficulty
          ? <Pill tone={stat.difficulty.tone}>Difficulté : {stat.difficulty.label}</Pill>
          : <Pill tone="slate">Difficulté : à déterminer</Pill>}
      </div>
      {stat.attempts === 0 ? (
        <p className={`text-sm ${c.faint}`}>Aucune tentative enregistrée pour l'instant — les statistiques apparaîtront dès que des étudiants auront pratiqué cette question.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label}>
              <p className={`font-display font-extrabold text-2xl ${c.text}`}>{t.value}</p>
              <p className={`text-xs ${c.faint}`}>{t.label}</p>
            </div>
          ))}
        </div>
      )}
      <p className={`text-[11px] mt-3 ${c.faint}`}>La difficulté est calculée à partir du taux de réussite (min. 5 tentatives) ; le temps moyen est estimé.</p>
    </div>
  );
}

/* ------------------------------ live preview ----------------------------- */

// Renders the question exactly as students meet it: MCQs run through the
// real Quiz engine, prompts through the workshop-style consigne card.
function QuestionPreview({ question, onClose }) {
  const { c } = useApp();
  const section = sectionById(question.section);
  const mcq = section.kind === "mcq";
  const p = question.payload;
  return (
    <Modal title={`Aperçu — ${section.label}${question.task ? ` · Tâche ${question.task}` : ""}`} onClose={onClose} wide>
      {question.id && <div className="mb-5"><QuestionStats questionId={question.id} /></div>}
      {mcq ? (
        <Quiz
          questions={[{
            q: [p.passage, p.transcript, p.q].filter(Boolean).join(" — "),
            opts: (p.opts || []).filter((o) => String(o).trim()),
            a: p.answerIndex, exp: p.exp || "",
            audio: p.audio || null, image: p.image || null,
          }]}
          duration={Number(p.duration) || 90}
          storageKey={`preview-${question.id || "new"}`}
          renderAbove={(q) => <BankQuestionMedia question={q} />}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {question.section === "eo" && <Pill tone="blue">{Number(p.prepTime) ? `Préparation : ${p.prepTime} s` : "Sans préparation"}</Pill>}
            {question.section === "eo" && <Pill tone="red">Parole : {p.speakTime} s</Pill>}
            {question.section === "ee" && <Pill tone="red">{p.minWords} à {p.maxWords} mots</Pill>}
          </div>
          <p className={`leading-relaxed font-medium ${c.text}`}>{p.prompt}</p>
          {p.instructions && <p className={`text-sm ${c.sub}`}>{p.instructions}</p>}
          {p.image && <img src={p.image} alt="" className="max-h-56 rounded-2xl object-contain" />}
          {p.sample && (
            <div className="p-4 rounded-2xl bg-blue-600/10">
              <p className="text-xs font-bold text-blue-600 mb-1">EXEMPLE DE RÉPONSE (visible côté admin)</p>
              <p className={`text-sm leading-relaxed ${c.sub}`}>{p.sample}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------ editor drawer ---------------------------- */

function Field({ field, value, payload, onChange, notify }) {
  const { c } = useApp();
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const fileRef = useRef(null);
  if (field.kind === "options") {
    const opts = value || ["", "", "", ""];
    return (
      <div>
        <p className={`text-xs font-semibold mb-2 ${c.sub}`}>{field.label} — cochez la bonne réponse</p>
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="answerIndex" checked={payload.answerIndex === i} onChange={() => onChange("answerIndex", i)} aria-label={`Bonne réponse : choix ${i + 1}`} className="accent-blue-600 w-4 h-4 shrink-0" />
              <input value={o} onChange={(e) => onChange(field.key, opts.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Choix ${String.fromCharCode(65 + i)}`} aria-label={`Choix ${i + 1}`} className={inp} />
              {opts.length > 2 && (
                <button aria-label="Retirer ce choix" onClick={() => { onChange(field.key, opts.filter((_, k) => k !== i)); if (payload.answerIndex === i) onChange("answerIndex", null); }} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600 shrink-0`}><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
        {opts.length < 6 && <Btn small variant="ghost" className="mt-2" icon={Plus} onClick={() => onChange(field.key, [...opts, ""])}>Ajouter un choix</Btn>}
      </div>
    );
  }
  if (field.kind === "audio" || field.kind === "image") {
    return (
      <div>
        <p className={`text-xs font-semibold mb-2 ${c.sub}`}>{field.label}</p>
        <div className="flex gap-2">
          <input value={value || ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={`URL ${field.kind === "audio" ? "du MP3" : "de l'image"} (ou téléversez)`} aria-label={field.label} className={inp} />
          <Btn small variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Téléverser</Btn>
          <input ref={fileRef} type="file" accept={field.kind === "audio" ? "audio/*" : "image/*"} className="hidden" aria-label={`Téléverser ${field.label}`}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try { onChange(field.key, await uploadMedia(file, field.kind)); notify("Fichier téléversé — réutilisable dans d'autres questions."); }
              catch (err) { notify(err.message); }
            }} />
        </div>
        {value && field.kind === "audio" && <audio controls src={value} className="w-full mt-2" style={{ height: 36 }} />}
        {value && field.kind === "image" && <img src={value} alt="" className="max-h-32 rounded-xl mt-2 object-contain" />}
      </div>
    );
  }
  if (field.kind === "tags") {
    return (
      <div>
        <p className={`text-xs font-semibold mb-2 ${c.sub}`}>{field.label} (séparés par des virgules)</p>
        <input value={(value || []).join(", ")} onChange={(e) => onChange(field.key, e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} aria-label={field.label} className={inp} />
      </div>
    );
  }
  if (field.kind === "number") {
    return (
      <div>
        <p className={`text-xs font-semibold mb-2 ${c.sub}`}>{field.label}</p>
        <input type="number" value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} aria-label={field.label} className={inp} />
      </div>
    );
  }
  const Tag = field.kind === "textarea" ? "textarea" : "input";
  return (
    <div>
      <p className={`text-xs font-semibold mb-2 ${c.sub}`}>{field.label}{field.required ? " *" : ""}</p>
      <Tag rows={field.kind === "textarea" ? 3 : undefined} value={value || ""} onChange={(e) => onChange(field.key, e.target.value)} aria-label={field.label} className={inp} />
    </div>
  );
}

function Editor({ initial, existing, onSaved, onClose }) {
  const { c, user, notify } = useApp();
  const [q, setQ] = useState(initial);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const section = sectionById(q.section);
  const sel = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const setPayload = (key, value) => setQ((prev) => ({ ...prev, payload: { ...prev.payload, [key]: value } }));
  const changeSection = (id) => setQ((prev) => ({ ...emptyQuestion(id), id: prev.id, difficulty: prev.difficulty, status: prev.status }));

  const save = async () => {
    const errs = validateQuestion(q, existing);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    const saved = q.id ? await updateQuestion(user?.id, q) : await createQuestion(user?.id, q);
    await syncSiteContent();
    setSaving(false);
    notify(q.id ? "Question mise à jour — visible immédiatement sur le site." : "Question créée — visible immédiatement sur le site.");
    onSaved(saved);
  };

  return (
    <Modal title={q.id ? `Modifier la question (v${q.version ?? 1})` : "Nouvelle question"} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className={`text-xs font-semibold mb-2 ${c.sub}`}>Épreuve</p>
            <select value={q.section} onChange={(e) => changeSection(e.target.value)} aria-label="Épreuve" className={sel}>
              {QUESTION_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          {section.tasks.length > 0 && (
            <div>
              <p className={`text-xs font-semibold mb-2 ${c.sub}`}>Tâche</p>
              <select value={q.task ?? ""} onChange={(e) => setQ({ ...q, task: Number(e.target.value) })} aria-label="Tâche" className={sel}>
                {section.tasks.map((t) => <option key={t} value={t}>Tâche {t}</option>)}
              </select>
            </div>
          )}
        </div>

        {section.fields.map((f) => (
          <Field key={f.key} field={f} value={q.payload[f.key]} payload={q.payload} onChange={setPayload} notify={notify} />
        ))}

        <div>
          <p className={`text-xs font-semibold mb-2 ${c.sub}`}>Étiquettes (séparées par des virgules)</p>
          <input value={q.tags.join(", ")} onChange={(e) => setQ({ ...q, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} aria-label="Étiquettes" className={sel} />
        </div>

        {errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/30">
            {errors.map((e, i) => <p key={i} className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{e}</p>)}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <Btn small variant="ghost" icon={PlayCircle} onClick={() => setShowPreview(true)}>Prévisualiser</Btn>
          <div className="flex gap-2">
            <Btn small variant="ghost" onClick={onClose}>Annuler</Btn>
            <Btn small icon={Plus} disabled={saving} onClick={save}>{saving ? "Enregistrement…" : q.id ? "Enregistrer" : "Créer la question"}</Btn>
          </div>
        </div>
      </div>
      {showPreview && <QuestionPreview question={q} onClose={() => setShowPreview(false)} />}
    </Modal>
  );
}

/* ----------------------------- version history --------------------------- */

function VersionHistory({ question, onRolledBack, onClose }) {
  const { c, user, notify } = useApp();
  const [versions, setVersions] = useState(null);
  useEffect(() => { listVersions(question).then(setVersions); }, [question]);
  return (
    <Modal title={`Historique — v${question.version ?? 1} actuelle`} onClose={onClose}>
      {versions === null ? (
        <p className={`text-sm py-4 text-center ${c.faint}`}>Chargement…</p>
      ) : versions.length === 0 ? (
        <p className={`text-sm py-4 text-center ${c.faint}`}>Aucune version antérieure : cette question n'a jamais été modifiée.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.version} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${c.border}`}>
              <Pill tone="slate">v{v.version}</Pill>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${c.text}`}>{String(v.payload?.q || v.payload?.prompt || "").slice(0, 60)}</p>
                <p className={`text-xs ${c.faint}`}>{v.editedAt ? new Date(v.editedAt).toLocaleString("fr-CA") : ""}</p>
              </div>
              <Btn small variant="ghost" icon={RotateCcw} onClick={async () => {
                await rollbackQuestion(user?.id, question, v);
                await syncSiteContent();
                notify(`Question restaurée à la version ${v.version}.`);
                onRolledBack();
              }}>Restaurer</Btn>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------- main ---------------------------------- */

export function QuestionManager() {
  const { c, user, notify } = useApp();
  const [questions, setQuestions] = useState(null);
  const [backend, setBackend] = useState("supabase");
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // question object being edited/created
  const [previewing, setPreviewing] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // ids awaiting confirmation
  const [rowStats, setRowStats] = useState({}); // questionId -> analytics, for the visible page
  // filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);
  const [fSection, setFSection] = useState("");
  const [fTask, setFTask] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const searchRef = useRef(null);
  const importRef = useRef(null);

  const reload = async () => {
    const { questions: list, backend: b } = await listQuestions();
    setQuestions(list);
    setBackend(b);
    setSelected(new Set());
  };
  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!questions) return [];
    let list = questions;
    if (fSection) list = list.filter((q) => q.section === fSection);
    if (fTask) list = list.filter((q) => String(q.task) === fTask);
    if (fStatus) list = list.filter((q) => q.status === fStatus);
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim().toLowerCase();
      list = list.filter((q) => String(q.id).toLowerCase().includes(s) || JSON.stringify(q.payload).toLowerCase().includes(s) || (q.tags || []).some((t) => t.toLowerCase().includes(s)));
    }
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      edited: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      alpha: (a, b) => previewText(a).localeCompare(previewText(b)),
    }[sort];
    return [...list].sort(by);
  }, [questions, fSection, fTask, fStatus, debouncedSearch, sort]);

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = pageSize === "all" ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => { setPage(0); }, [search, fSection, fTask, fStatus, pageSize]);

  // Analytics for the currently visible rows only (bounded query).
  const pageIdsKey = pageItems.map((q) => q.id).join(",");
  useEffect(() => {
    if (!pageIdsKey) return setRowStats({});
    let live = true;
    getAnalytics(pageIdsKey.split(",")).then((m) => { if (live) setRowStats(m); });
    return () => { live = false; };
  }, [pageIdsKey]);

  // Overview counts, derived once from the loaded set (real data, no fabrication).
  const stats = useMemo(() => {
    const all = questions || [];
    const byStatus = { active: 0, disabled: 0, archived: 0 };
    for (const q of all) if (q.status in byStatus) byStatus[q.status]++;
    return { total: all.length, byStatus };
  }, [questions]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (s.size === pageItems.length ? new Set() : new Set(pageItems.map((q) => q.id))));
  const ids = [...selected];

  const applyBulk = async (fn, message) => {
    await fn();
    await syncSiteContent();
    await reload();
    notify(message);
  };

  const exportSelected = () => {
    const rows = questions.filter((q) => selected.has(q.id));
    const blob = new window.Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `questions-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.URL.revokeObjectURL(a.href);
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = JSON.parse(await file.text());
      if (!Array.isArray(rows)) throw new Error("Le fichier doit contenir un tableau de questions.");
      let ok = 0, ko = 0;
      for (const row of rows) {
        const candidate = { ...emptyQuestion(row.section || "co"), ...row, id: null };
        if (validateQuestion(candidate, questions).length === 0) { await createQuestion(user?.id, candidate); ok++; }
        else ko++;
      }
      await syncSiteContent();
      await reload();
      notify(`${ok} question${ok > 1 ? "s" : ""} importée${ok > 1 ? "s" : ""}${ko ? ` · ${ko} rejetée${ko > 1 ? "s" : ""} (invalides)` : ""}.`);
    } catch (err) {
      notify(`Import impossible : ${err.message}`);
    }
    e.target.value = "";
  };

  const selCls = `px-3 py-2 rounded-xl border text-xs outline-none focus:border-blue-600 ${c.inputCls}`;

  if (questions === null) {
    return (
      <Card className="p-6 animate-pulse" aria-busy="true">
        <div className={`h-4 w-1/4 rounded-full ${c.track}`} />
        <div className={`h-40 rounded-2xl mt-4 ${c.track}`} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {backend === "local" && (
        <Card className="p-4 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>Stockage local : exécutez <span className="font-mono2">supabase/migrations/20260708_questions.sql</span> pour que les questions soient partagées entre administrateurs et visibles de tous les utilisateurs.</p>
        </Card>
      )}

      {/* overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="font-display font-extrabold text-3xl grad-text">{stats.total}</p>
          <p className={`text-sm font-medium mt-0.5 ${c.text}`}>Questions au total</p>
        </Card>
        {QUESTION_STATUSES.map((s) => {
          const on = fStatus === s.id;
          return (
            <button key={s.id} onClick={() => setFStatus(on ? "" : s.id)} aria-pressed={on} className="text-left">
              <Card className={`p-4 h-full transition-colors ${on ? "border-2 border-blue-600/50" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className={`font-display font-extrabold text-3xl ${c.text}`}>{stats.byStatus[s.id]}</p>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
                <p className={`text-xs mt-1 ${c.faint}`}>{on ? "Filtre actif — cliquez pour retirer" : "Cliquez pour filtrer"}</p>
              </Card>
            </button>
          );
        })}
      </div>

      {/* toolbar */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (touche /)" aria-label="Rechercher une question" className={`w-full pl-10 pr-4 py-2.5 rounded-full border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
          </div>
          <select value={fSection} onChange={(e) => { setFSection(e.target.value); setFTask(""); }} aria-label="Filtrer par épreuve" className={selCls}>
            <option value="">Toutes les épreuves</option>
            {QUESTION_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={fTask} onChange={(e) => setFTask(e.target.value)} aria-label="Filtrer par tâche" className={selCls} disabled={!fSection || sectionById(fSection)?.tasks.length === 0}>
            <option value="">Toutes les tâches</option>
            {(sectionById(fSection)?.tasks || []).map((t) => <option key={t} value={t}>Tâche {t}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filtrer par statut" className={selCls}>
            <option value="">Tous les statuts</option>
            {QUESTION_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier" className={selCls}>
            {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Btn small variant="ghost" icon={Upload} onClick={() => importRef.current?.click()}>Importer</Btn>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importFile} aria-label="Importer un fichier JSON" />
          <Btn small icon={Plus} onClick={() => setEditing(emptyQuestion(fSection || "co"))}>Nouvelle question</Btn>
        </div>
      </Card>

      {/* bulk bar */}
      {ids.length > 0 && (
        <Card className="p-3 flex items-center gap-2 flex-wrap border-blue-600/40 border-2">
          <Pill tone="blue">{ids.length} sélectionnée{ids.length > 1 ? "s" : ""}</Pill>
          <Btn small variant="ghost" icon={Eye} onClick={() => applyBulk(() => patchQuestions(ids, { status: "active" }), "Questions activées.")}>Activer</Btn>
          <Btn small variant="ghost" icon={EyeOff} onClick={() => applyBulk(() => patchQuestions(ids, { status: "disabled" }), "Questions désactivées.")}>Désactiver</Btn>
          <Btn small variant="ghost" icon={Archive} onClick={() => applyBulk(() => patchQuestions(ids, { status: "archived" }), "Questions archivées.")}>Archiver</Btn>
          <Btn small variant="ghost" icon={Copy} onClick={() => applyBulk(() => duplicateQuestions(user?.id, questions.filter((q) => selected.has(q.id))), "Questions dupliquées (désactivées par défaut).")}>Dupliquer</Btn>
          <select onChange={(e) => e.target.value && applyBulk(() => patchQuestions(ids, { task: Number(e.target.value) }), `Tâche changée : ${e.target.value}.`)} defaultValue="" aria-label="Changer la tâche" className={selCls}>
            <option value="" disabled>Tâche →</option>
            {[1, 2, 3].map((t) => <option key={t} value={t}>Tâche {t}</option>)}
          </select>
          <Btn small variant="ghost" icon={Download} onClick={exportSelected}>Exporter</Btn>
          {confirmDelete === "bulk" ? (
            <Btn small variant="accent" icon={Trash2} onClick={() => { setConfirmDelete(null); applyBulk(() => deleteQuestions(ids), "Questions supprimées définitivement."); }}>Confirmer la suppression</Btn>
          ) : (
            <Btn small variant="ghost" icon={Trash2} onClick={() => setConfirmDelete("bulk")}>Supprimer</Btn>
          )}
        </Card>
      )}

      {/* table */}
      <Card className="p-0 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className={`font-display font-bold ${c.text}`}>Aucune question {questions.length > 0 ? "ne correspond à ces filtres" : "pour l'instant"}</p>
            <p className={`text-sm mt-2 ${c.sub}`}>{questions.length > 0 ? "Élargissez la recherche ou effacez les filtres." : "Créez votre première question : elle apparaîtra immédiatement dans la pratique."}</p>
            {questions.length === 0 && <Btn small className="mt-4" icon={Plus} onClick={() => setEditing(emptyQuestion("co"))}>Créer une question</Btn>}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className={`text-left text-xs uppercase tracking-wider ${c.faint} border-b ${c.border}`}>
                <th className="p-3"><input type="checkbox" checked={pageItems.length > 0 && selected.size === pageItems.length} onChange={toggleAll} aria-label="Tout sélectionner" className="accent-blue-600" /></th>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Épreuve</th>
                <th className="p-3 font-semibold">Tâche</th>
                <th className="p-3 font-semibold">Question</th>
                <th className="p-3 font-semibold">Réussite</th>
                <th className="p-3 font-semibold">Statut</th>
                <th className="p-3 font-semibold">Créée</th>
                <th className="p-3 font-semibold">Modifiée</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((q) => {
                const st = statusOf(q.status);
                return (
                  <tr key={q.id} className={`border-b ${c.border} ${selected.has(q.id) ? "bg-blue-600/5" : ""}`}>
                    <td className="p-3"><input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} aria-label={`Sélectionner ${previewText(q)}`} className="accent-blue-600" /></td>
                    <td className={`p-3 font-mono2 text-xs ${c.faint}`}>{String(q.id).slice(0, 8)}</td>
                    <td className={`p-3 ${c.sub}`}>{sectionById(q.section)?.label || q.section}</td>
                    <td className={`p-3 font-mono2 ${c.sub}`}>{q.task ? `T${q.task}` : "—"}</td>
                    <td className={`p-3 max-w-64 truncate ${c.text}`} title={previewText(q)}>{previewText(q)}</td>
                    <td className="p-3">
                      {rowStats[q.id]?.attempts > 0
                        ? <span title={`${rowStats[q.id].attempts} tentative${rowStats[q.id].attempts > 1 ? "s" : ""}`}><Pill tone={rowStats[q.id].difficulty?.tone || "slate"}>{rowStats[q.id].successRate} %</Pill></span>
                        : <span className={`text-xs ${c.faint}`}>—</span>}
                    </td>
                    <td className="p-3"><Pill tone={st.tone}>{st.label} · v{q.version ?? 1}</Pill></td>
                    <td className={`p-3 font-mono2 text-xs ${c.faint}`}>{fmtDate(q.createdAt)}</td>
                    <td className={`p-3 font-mono2 text-xs ${c.faint}`}>{fmtDate(q.updatedAt)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button aria-label="Prévisualiser" title="Prévisualiser" onClick={() => setPreviewing(q)} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}><PlayCircle size={15} /></button>
                        <button aria-label="Modifier" title="Modifier" onClick={() => setEditing(q)} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}><Pencil size={15} /></button>
                        <button aria-label="Historique" title="Versions" onClick={() => setHistoryFor(q)} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}><History size={15} /></button>
                        {q.status === "archived" ? (
                          <button aria-label="Restaurer" title="Restaurer" onClick={() => applyBulk(() => patchQuestions([q.id], { status: "active" }), "Question restaurée.")} className={`p-2 rounded-xl ${c.hoverSoft} text-emerald-600`}><ArchiveRestore size={15} /></button>
                        ) : (
                          <button aria-label={q.status === "active" ? "Désactiver" : "Activer"} title={q.status === "active" ? "Désactiver" : "Activer"} onClick={() => applyBulk(() => patchQuestions([q.id], { status: q.status === "active" ? "disabled" : "active" }), q.status === "active" ? "Question désactivée." : "Question activée.")} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}>{q.status === "active" ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                        )}
                        {confirmDelete === q.id ? (
                          <button aria-label="Confirmer la suppression" onClick={() => { setConfirmDelete(null); applyBulk(() => deleteQuestions([q.id]), "Question supprimée."); }} className="p-2 rounded-xl bg-rose-600 text-white"><Trash2 size={15} /></button>
                        ) : (
                          <button aria-label="Supprimer" title="Supprimer" onClick={() => setConfirmDelete(q.id)} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className={`text-xs ${c.faint}`}>{filtered.length} question{filtered.length > 1 ? "s" : ""} · page {page + 1} / {pageCount}</p>
          <div className="flex items-center gap-2">
            <select value={String(pageSize)} onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))} aria-label="Questions par page" className={selCls}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s === "all" ? "Toutes" : `${s} / page`}</option>)}
            </select>
            <Btn small variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédente</Btn>
            <Btn small variant="ghost" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Suivante</Btn>
          </div>
        </div>
      )}

      {editing && <Editor initial={editing} existing={questions} onSaved={() => { setEditing(null); reload(); }} onClose={() => setEditing(null)} />}
      {previewing && <QuestionPreview question={previewing} onClose={() => setPreviewing(null)} />}
      {historyFor && <VersionHistory question={historyFor} onRolledBack={() => { setHistoryFor(null); reload(); }} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}
