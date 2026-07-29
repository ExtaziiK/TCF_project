import {
  Headphones, BookOpen, PenLine, Mic, Languages, GraduationCap,
  Target, TrendingUp, Leaf, Shield,
} from "lucide-react";

// Where a home stat draws its number from. `questions`, `series` and
// `exercises` are counted live from the shipped content; `users`, `quizzes` and
// `exams` are snapshots the admin publishes from the live Supabase figures (a
// logged-out visitor cannot read those tables); `manual` is free text.
// Declared here rather than in contentStats.js so settingsService can validate
// a saved config without pulling the whole quiz bank into its bundle.
export const STAT_SOURCES = ["questions", "series", "exercises", "users", "quizzes", "exams", "manual"];

export const STAT_SOURCE_LABELS = {
  questions: "Auto · questions du banc",
  series: "Auto · séries d'entraînement",
  exercises: "Auto · exercices grammaire & vocabulaire",
  users: "Site · étudiants inscrits",
  quizzes: "Site · quiz complétés",
  exams: "Site · TCF blancs terminés",
  manual: "Valeur libre",
};

// The "chiffres clés" band on the landing page. Admin-editable and toggleable
// (Admin › Accueil › Chiffres clés, stored in site_settings.home_stats); this is
// the shape used until an admin saves their own — every figure is real, none is
// invented. `src` picks where the number comes from (see contentStats.js):
// content counts resolve live, site counts start at 0 and grow as the admin
// republishes them from the live Supabase figures.
export const HOME_STATS_DEFAULT = {
  enabled: true,
  items: [
    { src: "questions", n: "", l: "questions type TCF" },
    { src: "series", n: "", l: "séries d'entraînement" },
    { src: "exercises", n: "", l: "exercices grammaire & vocabulaire" },
    { src: "users", n: "0", l: "étudiants inscrits" },
  ],
};

export const FEATURES = [
  { icon: Headphones, t: "Compréhension orale", d: "Des centaines d'audios avec accents québécois et français, corrigés instantanément.", route: "listening" },
  { icon: BookOpen, t: "Compréhension écrite", d: "Textes authentiques, surlignage interactif et explications détaillées.", route: "reading" },
  { icon: PenLine, t: "Expression écrite", d: "Éditeur avec compteur de mots, exemples de réponses et analyse IA.", route: "writing" },
  { icon: Mic, t: "Expression orale", d: "Enregistrez-vous, réécoutez-vous et suivez vos progrès tâche par tâche.", route: "speaking" },
  { icon: Languages, t: "Vocabulaire ciblé", d: "Cartes mémoire par thème : immigration, travail, vie quotidienne.", route: "vocabulary" },
  { icon: GraduationCap, t: "Grammaire structurée", d: "Leçons courtes suivies d'exercices, des articles aux connecteurs.", route: "grammar" },
];

export const WHY = [
  { icon: Target, t: "Format 100 % TCF Canada", d: "Chaque question respecte le format, le minutage et la difficulté officiels de l'épreuve." },
  { icon: TrendingUp, t: "Progression mesurée", d: "Un niveau CECR estimé après chaque session, avec un plan d'étude qui s'adapte à vous." },
  { icon: Leaf, t: "Pensé pour le Canada", d: "Contextes canadiens : Entrée express, accents d'ici, situations de la vie à Montréal ou Moncton." },
  { icon: Shield, t: "Corrections fiables", d: "Explications rédigées par des enseignants de FLE certifiés, pas seulement une bonne réponse." },
];

export const TESTIMONIALS = [
  { name: "Amira B.", from: "Casablanca → Montréal", level: "C1 obtenu", text: "En 8 semaines, je suis passée de B1 à C1 en compréhension orale. Les TCF blancs m'ont enlevé tout le stress le jour J." },
  { name: "Diego M.", from: "Bogotá → Québec", level: "B2 obtenu", text: "Le suivi de progression m'a montré exactement où je perdais des points. J'ai obtenu les 50 points d'Entrée express qu'il me fallait." },
  { name: "Lan N.", from: "Hanoï → Ottawa", level: "B2 obtenu", text: "Les cartes de vocabulaire quotidiennes et la série de jours d'étude m'ont gardée motivée jusqu'à l'examen." },
];
