import {
  Headphones, BookOpen, PenLine, Mic, Languages, GraduationCap,
  Target, TrendingUp, Leaf, Shield, Sparkles, Wallet,
} from "lucide-react";

// Where a home stat draws its number from. Every source but `manual` is
// automatic: `questions`, `series` and `exercises` are counted from the shipped
// content, the others (LIVE_SOURCES) come from /api/public/stats, which counts
// the database server-side — a logged-out visitor cannot read those tables.
// `manual` is free text.
// Until 2026-10-26 `users`, `quizzes` and `exams` were snapshots the admin
// re-published by hand; `quizzes` and `exams` are live now under the same ids,
// and a saved `users` row reads as `students` (settingsService).
// Declared here rather than in contentStats.js so settingsService can validate
// a saved config without pulling the whole quiz bank into its bundle.
export const LIVE_SOURCES = ["students", "quizzes", "exams", "answers", "dictees", "corrections"];
export const STAT_SOURCES = ["questions", "series", "exercises", ...LIVE_SOURCES, "manual"];
export const LEGACY_SOURCES = { users: "students" };

export const STAT_SOURCE_LABELS = {
  questions: "Auto · questions du banc",
  series: "Auto · séries d'entraînement",
  exercises: "Auto · exercices grammaire & vocabulaire",
  students: "Auto · étudiants inscrits",
  quizzes: "Auto · quiz complétés",
  exams: "Auto · TCF blancs terminés",
  answers: "Auto · réponses enregistrées",
  dictees: "Auto · textes de dictée",
  corrections: "Auto · corrections par l'IA",
  manual: "Valeur libre",
};

// The label a row gets when its source is picked, so a new row is ready to
// save without typing.
export const STAT_DEFAULT_LABELS = {
  questions: "questions type TCF",
  series: "séries d'entraînement",
  exercises: "exercices grammaire & vocabulaire",
  students: "étudiants inscrits",
  quizzes: "quiz complétés",
  exams: "TCF blancs terminés",
  answers: "réponses enregistrées",
  dictees: "textes de dictée",
  corrections: "corrections par l'IA",
  manual: "",
};

export const MAX_HOME_STATS = 8;

// The statistics band on the landing page. Admin-editable and toggleable
// (Admin › Accueil › Statistique, stored in site_settings.home_stats); this is
// the shape used until an admin saves their own — every figure is real, none is
// invented, and every one updates by itself (see contentStats.js).
export const HOME_STATS_DEFAULT = {
  enabled: true,
  items: ["questions", "series", "exercises", "students", "answers", "quizzes", "dictees", "corrections"]
    .map((src) => ({ src, n: "", l: STAT_DEFAULT_LABELS[src] })),
};

export const FEATURES = [
  { icon: Headphones, t: "Compréhension orale", d: "Des centaines d'audios avec accents québécois et français, corrigés instantanément.", route: "listening" },
  { icon: BookOpen, t: "Compréhension écrite", d: "Textes authentiques, surlignage interactif et explications détaillées.", route: "reading" },
  { icon: PenLine, t: "Expression écrite", d: "Éditeur avec compteur de mots, exemples de réponses et analyse IA.", route: "writing" },
  { icon: Mic, t: "Expression orale", d: "Enregistrez-vous, réécoutez-vous et suivez vos progrès tâche par tâche.", route: "speaking" },
  { icon: Languages, t: "Vocabulaire ciblé", d: "Cartes mémoire par thème : immigration, travail, vie quotidienne.", route: "vocabulary" },
  { icon: GraduationCap, t: "Grammaire structurée", d: "Leçons courtes suivies d'exercices, des articles aux connecteurs.", route: "grammar" },
];

// "Pourquoi nous choisir ?" in the landing hero, under the figures: four
// points, a title and one line each. No price in the copy — prices are edited
// in the admin, so a figure here would go stale.
export const WHY_HERO = [
  { icon: Target, t: "Format 100 % TCF Canada", d: "Format, minutage et difficulté officiels" },
  { icon: Sparkles, t: "Correction détaillée avec IA", d: "Réponses expliquées, écrit et oral évalués" },
  { icon: TrendingUp, t: "Suivi de progression", d: "Scores et niveau NCLC suivis à chaque séance" },
  { icon: Wallet, t: "Tarif compétitif", d: "Accès complet à petit prix, sans engagement" },
];

// The "À propos" page's arguments, each with its full sentence.
export const WHY = [
  { icon: Target, t: "Format 100 % TCF Canada", d: "Chaque question respecte le format, le minutage et la difficulté officiels de l'épreuve." },
  { icon: TrendingUp, t: "Progression mesurée", d: "Vos scores, votre niveau NCLC estimé et vos points faibles, suivis à chaque séance." },
  { icon: Leaf, t: "Pensé pour le Canada", d: "Contextes canadiens : Entrée express, accents d'ici, situations de la vie à Montréal ou Moncton." },
  { icon: Shield, t: "Corrections détaillées", d: "Chaque réponse est expliquée, et l'IA évalue votre écrit et votre oral : niveau, erreurs et version améliorée." },
];

export const TESTIMONIALS = [
  { name: "Amira B.", from: "Casablanca → Montréal", level: "C1 obtenu", text: "En 8 semaines, je suis passée de B1 à C1 en compréhension orale. Les TCF blancs m'ont enlevé tout le stress le jour J." },
  { name: "Diego M.", from: "Bogotá → Québec", level: "B2 obtenu", text: "Le suivi de progression m'a montré exactement où je perdais des points. J'ai obtenu les 50 points d'Entrée express qu'il me fallait." },
  { name: "Lan N.", from: "Hanoï → Ottawa", level: "B2 obtenu", text: "Les cartes de vocabulaire quotidiennes et la série de jours d'étude m'ont gardée motivée jusqu'à l'examen." },
];
