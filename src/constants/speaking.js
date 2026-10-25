import { EO_TIMINGS } from "../../api/_lib/eoLines.js";

// Built-in Expression orale subjects (free tier and archive fallback). The
// timings are the official ones, shared with the server (api/_lib/eoLines.js).
export const SPEAKING_TASKS = [
  { id: 1, t: "Tâche 1 · Entretien dirigé", ...EO_TIMINGS[1], prompt: "Présentez-vous : votre parcours, vos études ou votre travail, et vos projets au Canada." },
  { id: 2, t: "Tâche 2 · Interaction", ...EO_TIMINGS[2], prompt: "Vous souhaitez vous inscrire à un centre sportif à Gatineau. Posez des questions à l'employé sur les horaires, les tarifs et les activités offertes." },
  { id: 3, t: "Tâche 3 · Point de vue", ...EO_TIMINGS[3], prompt: "Certains pensent que les réseaux sociaux rapprochent les gens, d'autres qu'ils les isolent. Exprimez votre opinion de façon structurée." },
];
