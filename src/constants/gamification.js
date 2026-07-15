import { Flame, Headphones, Target, Trophy, Zap, Award } from "lucide-react";

export const BADGES = [
  { icon: Flame, t: "Série de 7 jours", got: true },
  { icon: Headphones, t: "100 audios", got: true },
  { icon: Target, t: "Premier B2", got: true },
  { icon: Trophy, t: "TCF blanc terminé", got: true },
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
