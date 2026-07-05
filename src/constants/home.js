import {
  Headphones, BookOpen, PenLine, Mic, Languages, GraduationCap,
  Target, TrendingUp, Leaf, Shield,
} from "lucide-react";

export const STATS = [
  { n: "12 400+", l: "étudiants accompagnés" },
  { n: "94 %", l: "atteignent leur niveau cible" },
  { n: "3 200+", l: "questions type TCF" },
  { n: "+68 pts", l: "de progression moyenne" },
];

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
  { name: "Amira B.", from: "Casablanca → Montréal", level: "C1 obtenu", text: "En 8 semaines, je suis passée de B1 à C1 en compréhension orale. Les examens blancs m'ont enlevé tout le stress le jour J." },
  { name: "Diego M.", from: "Bogotá → Québec", level: "B2 obtenu", text: "Le suivi de progression m'a montré exactement où je perdais des points. J'ai obtenu les 50 points d'Entrée express qu'il me fallait." },
  { name: "Lan N.", from: "Hanoï → Ottawa", level: "B2 obtenu", text: "Les cartes de vocabulaire quotidiennes et la série de jours d'étude m'ont gardée motivée jusqu'à l'examen." },
];
