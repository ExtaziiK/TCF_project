// Single source of truth for the Question Management System: which sections
// exist, which tasks they contain, which fields their editor shows, and how
// each question type is validated and previewed. Adding a future TCF section
// (or a new field on an existing one) means editing THIS file only — the
// editor form, validation, table filters and site integration all derive
// from it.

export const DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const QUESTION_STATUSES = [
  { id: "active", label: "Active", tone: "green" },
  { id: "disabled", label: "Désactivée", tone: "amber" },
  { id: "archived", label: "Archivée", tone: "slate" },
];

// Field kinds understood by the editor: text, textarea, options (list of
// choices + correct index), number, audio (URL or upload), image (URL or
// upload), tags (comma-separated).
export const QUESTION_SECTIONS = [
  {
    id: "co",
    label: "Compréhension orale",
    kind: "mcq",
    tasks: [1, 2, 3],
    fields: [
      { key: "audio", label: "Fichier audio", kind: "audio", required: true },
      { key: "transcript", label: "Transcription (affichée dans l'énoncé)", kind: "textarea", required: false },
      { key: "q", label: "Question", kind: "textarea", required: true },
      { key: "opts", label: "Choix de réponse", kind: "options", required: true },
      { key: "exp", label: "Explication", kind: "textarea", required: false },
      { key: "duration", label: "Durée estimée (secondes)", kind: "number", required: false },
    ],
  },
  {
    id: "ce",
    label: "Compréhension écrite",
    kind: "mcq",
    tasks: [1, 2, 3],
    fields: [
      { key: "passage", label: "Texte / document", kind: "textarea", required: false },
      { key: "q", label: "Question", kind: "textarea", required: true },
      { key: "image", label: "Illustration (optionnelle)", kind: "image", required: false },
      { key: "opts", label: "Choix de réponse", kind: "options", required: true },
      { key: "exp", label: "Explication", kind: "textarea", required: false },
    ],
  },
  {
    id: "eo",
    label: "Expression orale",
    kind: "prompt",
    tasks: [1, 2, 3],
    fields: [
      { key: "prompt", label: "Consigne / sujet", kind: "textarea", required: true },
      { key: "image", label: "Image d'appui (optionnelle)", kind: "image", required: false },
      { key: "prepTime", label: "Temps de préparation (secondes)", kind: "number", required: true },
      { key: "speakTime", label: "Temps de parole (secondes)", kind: "number", required: true },
      { key: "criteria", label: "Critères d'évaluation", kind: "textarea", required: false },
      { key: "sample", label: "Exemple de réponse", kind: "textarea", required: false },
      { key: "keywords", label: "Mots-clés attendus", kind: "tags", required: false },
    ],
  },
  {
    id: "ee",
    label: "Expression écrite",
    kind: "prompt",
    tasks: [1, 2, 3],
    fields: [
      { key: "prompt", label: "Consigne d'écriture", kind: "textarea", required: true },
      { key: "instructions", label: "Instructions complémentaires", kind: "textarea", required: false },
      { key: "minWords", label: "Mots minimum", kind: "number", required: true },
      { key: "maxWords", label: "Mots maximum", kind: "number", required: true },
      { key: "criteria", label: "Critères d'évaluation", kind: "textarea", required: false },
      { key: "sample", label: "Réponse modèle", kind: "textarea", required: false },
      { key: "grammarTags", label: "Points de grammaire", kind: "tags", required: false },
      { key: "vocabTags", label: "Champs lexicaux", kind: "tags", required: false },
    ],
  },
  {
    id: "grammar",
    label: "Grammaire",
    kind: "mcq",
    tasks: [],
    fields: [
      { key: "q", label: "Question / phrase à compléter", kind: "textarea", required: true },
      { key: "opts", label: "Choix de réponse", kind: "options", required: true },
      { key: "exp", label: "Explication", kind: "textarea", required: false },
      { key: "topic", label: "Notion (ex. subjonctif)", kind: "text", required: false },
    ],
  },
  {
    id: "vocab",
    label: "Vocabulaire",
    kind: "mcq",
    tasks: [],
    fields: [
      { key: "q", label: "Définition / question", kind: "textarea", required: true },
      { key: "opts", label: "Choix de réponse", kind: "options", required: true },
      { key: "exp", label: "Explication", kind: "textarea", required: false },
      { key: "theme", label: "Thème (ex. immigration)", kind: "text", required: false },
    ],
  },
];

export const sectionById = (id) => QUESTION_SECTIONS.find((s) => s.id === id);

export const SORT_OPTIONS = [
  { id: "newest", label: "Plus récentes" },
  { id: "oldest", label: "Plus anciennes" },
  { id: "edited", label: "Modifiées récemment" },
  { id: "alpha", label: "Alphabétique" },
  // "Most used" / "highest error rate" need per-question answer analytics —
  // planned once a quiz_answers table exists.
];

export const PAGE_SIZES = [25, 50, 100, "all"];

/* ------------------------------ validation ------------------------------- */

// Returns a list of error strings; empty list = valid. `existing` lets the
// caller enforce duplicate detection (same section + same question text).
export function validateQuestion(question, existing = []) {
  const errors = [];
  const section = sectionById(question.section);
  if (!section) return ["Épreuve inconnue."];
  if (section.tasks.length > 0 && !section.tasks.includes(Number(question.task))) {
    errors.push("Choisissez la tâche à laquelle cette question appartient.");
  }

  const p = question.payload || {};
  for (const f of section.fields) {
    const v = p[f.key];
    if (!f.required) continue;
    if (f.kind === "options") {
      const opts = (v || []).map((o) => String(o || "").trim()).filter(Boolean);
      if (opts.length < 2) errors.push("Au moins deux choix de réponse sont requis.");
      if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) errors.push("Deux choix de réponse sont identiques.");
      if (!Number.isInteger(p.answerIndex) || p.answerIndex < 0 || p.answerIndex >= opts.length) {
        errors.push("Sélectionnez la bonne réponse.");
      }
    } else if (f.kind === "number") {
      if (v === undefined || v === null || v === "" || Number.isNaN(Number(v))) errors.push(`« ${f.label} » est requis.`);
    } else if (!String(v || "").trim()) {
      errors.push(`« ${f.label} » est requis.`);
    }
  }
  if (section.id === "ee" && Number(p.minWords) >= Number(p.maxWords)) {
    errors.push("Le minimum de mots doit être inférieur au maximum.");
  }
  // duplicate detection on the main text field
  const textKey = section.kind === "mcq" ? "q" : "prompt";
  const norm = String(p[textKey] || "").trim().toLowerCase();
  if (norm && existing.some((e) => e.id !== question.id && e.section === question.section && String(e.payload?.[textKey] || "").trim().toLowerCase() === norm)) {
    errors.push("Une question identique existe déjà dans cette épreuve.");
  }
  return errors;
}

// Fresh empty question for the editor.
export function emptyQuestion(sectionId) {
  const section = sectionById(sectionId) || QUESTION_SECTIONS[0];
  const payload = {};
  for (const f of section.fields) payload[f.key] = f.kind === "options" ? ["", "", "", ""] : f.kind === "tags" ? [] : "";
  if (section.kind === "mcq") payload.answerIndex = null;
  return {
    id: null,
    section: section.id,
    task: section.tasks[0] ?? null,
    difficulty: "B1",
    status: "active",
    tags: [],
    payload,
  };
}
