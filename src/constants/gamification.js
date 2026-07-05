import { Flame, Headphones, Target, Trophy, Zap, Award, Calendar } from "lucide-react";

export const BADGES = [
  { icon: Flame, t: "Série de 7 jours", got: true },
  { icon: Headphones, t: "100 audios", got: true },
  { icon: Target, t: "Premier B2", got: true },
  { icon: Trophy, t: "Examen blanc terminé", got: true },
  { icon: Zap, t: "Série de 30 jours", got: false },
  { icon: Award, t: "Niveau C1 atteint", got: false },
];

export const LEADER = [
  { name: "Yuki T.", pts: 2840, streak: 21 },
  { name: "Amira B.", pts: 2610, streak: 12, me: true },
  { name: "Carlos R.", pts: 2455, streak: 18 },
  { name: "Fatou D.", pts: 2390, streak: 9 },
  { name: "Ivan P.", pts: 2120, streak: 14 },
];

export const NOTIFS = [
  { icon: Flame, t: "Série de 12 jours ! Continuez sur votre lancée.", time: "il y a 2 h" },
  { icon: Calendar, t: "Examen blanc n° 2 planifié samedi à 9 h.", time: "hier" },
  { icon: Award, t: "Nouveau badge : « Premier B2 » débloqué.", time: "il y a 3 jours" },
];

export const HISTORY = [
  { t: "Compréhension orale · Série B2", score: "8/10", date: "Aujourd'hui", min: 24 },
  { t: "Vocabulaire · Immigration", score: "12/12", date: "Aujourd'hui", min: 10 },
  { t: "Grammaire · Le subjonctif", score: "5/6", date: "Hier", min: 18 },
  { t: "Expression écrite · Tâche 2", score: "En révision", date: "Hier", min: 32 },
  { t: "Examen blanc n° 1 · Complet", score: "512/699", date: "Il y a 4 jours", min: 165 },
];
