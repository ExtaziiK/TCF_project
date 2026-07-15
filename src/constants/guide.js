import { Headphones, BookOpen, PenLine, Mic } from "lucide-react";

// Static reference data for the "Guide de l'examen" page, distilled from the
// official France Éducation international candidate manual (TCF Canada).

// The 4 mandatory épreuves — total duration 2 h 47. `long` is the detailed
// description revealed on hover; it deepens the short version shown on the
// TCF blancs page (MOCK_SECTIONS.desc), which links here for the full text.
export const GUIDE_EPREUVES = [
  { icon: Headphones, name: "Compréhension orale", detail: "39 questions à choix multiple", time: "35 min", more: "guide-co",
    long: "Annonces, dialogues, interviews et extraits radio à débit courant. Chaque enregistrement n'est diffusé qu'une seule fois et la question arrive après l'écoute : 4 propositions, une seule correcte, avec une difficulté progressive." },
  { icon: BookOpen, name: "Compréhension écrite", detail: "39 questions à choix multiple", time: "60 min", more: "guide-ce",
    long: "Documents authentiques — courriels, affiches, petites annonces, articles de presse, puis textes littéraires ou spécialisés. Vous lisez, puis répondez à des questions à choix multiple classées du plus simple au plus complexe." },
  { icon: PenLine, name: "Expression écrite", detail: "3 tâches à rédiger", time: "60 min", more: "guide-ee",
    long: "Trois tâches à rédiger : un message (60–120 mots), un compte rendu argumenté (120–150 mots) et un texte comparant deux points de vue (120–180 mots). Respectez les bornes de mots et traitez tous les points de la consigne." },
  { icon: Mic, name: "Expression orale", detail: "3 tâches avec un examinateur", time: "12 min", more: "guide-eo",
    long: "Entretien individuel avec un examinateur, en trois temps : entretien dirigé, exercice en interaction (2 min de préparation) puis expression d'un point de vue. L'échange est enregistré pour une double évaluation indépendante." },
];

// Score → CECRL level scale for the QCM épreuves (out of 699).
export const CECRL_SCALE = [
  { lvl: "A1 non atteint", range: "0–99" },
  { lvl: "A1", range: "100–199" },
  { lvl: "A2", range: "200–299" },
  { lvl: "B1", range: "300–399" },
  { lvl: "B2", range: "400–499" },
  { lvl: "C1", range: "500–599" },
  { lvl: "C2", range: "600–699" },
];

// TCF Canada results → Canadian Language Benchmark (NCLC/CLB) correspondence.
// Expression columns are the note /20; comprehension columns are the score /699.
export const NCLC_ROWS = [
  { nclc: "10 +", co: "549–699", ce: "549–699", eo: "16–20", ee: "16–20" },
  { nclc: "9", co: "523–548", ce: "524–548", eo: "14–15", ee: "14–15" },
  { nclc: "8", co: "503–522", ce: "499–523", eo: "12–13", ee: "12–13" },
  { nclc: "7", co: "458–502", ce: "453–498", eo: "10–11", ee: "10–11" },
  { nclc: "6", co: "398–457", ce: "406–452", eo: "7–9", ee: "7–9" },
  { nclc: "5", co: "369–397", ce: "375–405", eo: "6", ee: "6" },
  { nclc: "4", co: "331–368", ce: "342–374", eo: "4–5", ee: "4–5" },
];

// Expression écrite — 3 tâches with the imposed word counts.
export const EE_TASKS = [
  { n: 1, d: "Message pour décrire, raconter ou expliquer", meta: "60 à 120 mots" },
  { n: 2, d: "Article, courrier ou note : compte rendu ou récit argumenté", meta: "120 à 150 mots" },
  { n: 3, d: "Texte comparant deux points de vue sur un fait de société", meta: "120 à 180 mots" },
];

// Expression orale — 3 tâches with the length of each exchange.
export const EO_TASKS = [
  { n: 1, d: "Entretien dirigé, sans préparation", meta: "≈ 2 min" },
  { n: 2, d: "Exercice en interaction (2 min de préparation)", meta: "≈ 3 min 30" },
  { n: 3, d: "Expression d'un point de vue, sans préparation", meta: "≈ 4 min 30" },
];

// Exam-day checklist.
export const EXAM_DO = [
  "Une pièce d'identité avec photo, en cours de validité.",
  "Arriver à l'heure : aucun retard n'est admis une fois le matériel distribué.",
  "Être pris en photo le jour de l'examen (obligatoire pour le TCF Canada).",
  "Un stylo bleu ou noir — le reste de vos affaires est rangé à l'écart.",
];

export const EXAM_DONT = [
  "Téléphone, écouteurs, montre connectée, notes ou dictionnaire.",
  "Communiquer avec un autre candidat ou regarder sa copie.",
  "Sortir de la salle pendant la compréhension orale (diffusée une seule fois).",
  "Recopier le sujet ou être hors-sujet : la production serait notée « A1 non atteint ».",
];
