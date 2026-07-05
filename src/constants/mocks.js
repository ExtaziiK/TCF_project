import { Headphones, BookOpen, PenLine, Mic } from "lucide-react";

export const MOCKS = [
  { id: 1, name: "TCF Canada blanc n° 1", diff: "Standard", done: true, score: 512, sections: true },
  { id: 2, name: "TCF Canada blanc n° 2", diff: "Standard", done: false, score: null, sections: true },
  { id: 3, name: "TCF Canada blanc n° 3", diff: "Renforcé", done: false, score: null, sections: true },
];

export const MOCK_SECTIONS = [
  { icon: Headphones, t: "Compréhension orale", d: "39 questions · 35 min", route: "listening" },
  { icon: BookOpen, t: "Compréhension écrite", d: "39 questions · 60 min", route: "reading" },
  { icon: PenLine, t: "Expression écrite", d: "3 tâches · 60 min", route: "writing" },
  { icon: Mic, t: "Expression orale", d: "3 tâches · 12 min", route: "speaking" },
];
