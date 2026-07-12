import { Trophy, GraduationCap } from "lucide-react";

// The two ways to take a TCF blanc. `test` mirrors real exam conditions;
// `entrainement` is a relaxed practice run. The chosen mode drives the exam
// runner's behaviour (audio replay, navigation) — see Mocks.jsx / Quiz.jsx.
export const EXAM_MODES = [
  {
    id: "test",
    icon: Trophy,
    name: "Mode Test",
    tagline: "Conditions d'examen réelles",
    badge: "Recommandé pour l'examen",
    badgeTone: "red",
    feats: [
      "Audio joué une seule fois",
      "Pas de retour en arrière",
      "Progression séquentielle",
      "Évaluation authentique",
    ],
  },
  {
    id: "entrainement",
    icon: GraduationCap,
    name: "Mode Entraînement",
    tagline: "Apprentissage flexible",
    badge: "Idéal pour la préparation",
    badgeTone: "amber",
    feats: [
      "Réécouter l'audio",
      "Navigation libre",
      "Contrôle total",
      "Apprentissage en profondeur",
    ],
  },
];

// Country list for the candidate form (French names, alphabetical). Focused on
// the regions TCF Canada candidates most often come from, plus the major
// destinations — long enough to be useful without being an exhaustive ISO dump.
export const COUNTRIES = [
  "Afghanistan", "Afrique du Sud", "Algérie", "Allemagne", "Angola", "Arabie saoudite",
  "Argentine", "Australie", "Bangladesh", "Belgique", "Bénin", "Brésil", "Bulgarie",
  "Burkina Faso", "Burundi", "Cameroun", "Canada", "Chili", "Chine", "Colombie",
  "Comores", "Congo (Brazzaville)", "Congo (RDC)", "Corée du Sud", "Côte d'Ivoire",
  "Cuba", "Djibouti", "Égypte", "Émirats arabes unis", "Équateur", "Espagne",
  "États-Unis", "Éthiopie", "France", "Gabon", "Ghana", "Grèce", "Guinée", "Haïti",
  "Inde", "Indonésie", "Irak", "Iran", "Italie", "Japon", "Jordanie", "Kenya", "Liban",
  "Madagascar", "Mali", "Maroc", "Maurice", "Mauritanie", "Mexique", "Niger", "Nigéria",
  "Pakistan", "Pérou", "Philippines", "Pologne", "Portugal", "République dominicaine",
  "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "Sénégal", "Syrie", "Tchad", "Togo",
  "Tunisie", "Turquie", "Ukraine", "Venezuela", "Viêt Nam", "Autre",
];
