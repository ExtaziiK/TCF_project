// What the examiner says out loud in the Expression orale simulation, outside
// the AI-generated replies: the briefing that opens each tâche, the end of the
// Tâche 2 preparation, and the closings. Shared by api/expression-orale.js
// (which voices them) and the page (which falls back to browser TTS with the
// same text when the server can't voice them), so both always say the same.
//
// On exam day the examiner runs the room: welcomes the candidate, explains
// each tâche before it starts (what to do, how long, who speaks first), reads
// the subject, times the preparation and hands over ("c'est à vous").

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 1000);

// Official timings, in seconds. Tâche 2 is 5 min 30 IN ALL: 2 min of
// preparation, then 3 min 30 of interaction. 2:00 + 5:30 + 4:30 = 12 min.
export const EO_TIMINGS = {
  1: { prep: 0, dur: 120 },
  2: { prep: 120, dur: 210 },
  3: { prep: 0, dur: 270 },
};

// Said once, at the start of the full 12-minute épreuve (the TCF blanc).
const WELCOME = "Bonjour, et bienvenue à l'épreuve d'expression orale du TCF Canada. Elle dure douze minutes et comporte trois tâches, que nous allons faire l'une après l'autre. L'entretien est enregistré. Pendant l'épreuve, je ne pourrai pas vous aider, mais si vous ne comprenez pas une question, vous pouvez me demander de la répéter.";

// The briefing that opens a tâche. `exam` is the back-to-back run of the TCF
// blanc: the first tâche starts with the welcome, the next ones with a
// transition, where a practice session greets the candidate instead.
export function openingLine(task, prompt, { exam = false } = {}) {
  const p = clean(prompt);
  if (task === 1) {
    return [
      exam ? `${WELCOME} Nous commençons par la première tâche :` : "Bonjour, et bienvenue. Nous allons faire la première tâche de l'épreuve d'expression orale :",
      "c'est un entretien dirigé. Il dure deux minutes, sans préparation.",
      "Je vais vous demander de vous présenter, puis je vous poserai quelques questions sur vous. Répondez le plus naturellement possible, avec des phrases complètes, et n'hésitez pas à développer.",
      `Très bien, commençons. ${p}`,
    ].join(" ");
  }
  if (task === 2) {
    return [
      exam ? "Merci. Nous passons maintenant à la deuxième tâche :" : "Bonjour. Nous allons faire la deuxième tâche de l'épreuve d'expression orale :",
      "c'est un exercice en interaction.",
      "Je vais vous donner une situation de la vie quotidienne. Vous aurez deux minutes pour vous préparer, et vous pouvez prendre des notes.",
      "Ensuite, nous jouerons la scène pendant trois minutes trente. Je jouerai le rôle de la personne à qui vous vous adressez, et c'est vous qui commencerez la conversation : posez-moi toutes les questions nécessaires.",
      `Voici votre sujet. ${p}`,
      "Votre temps de préparation commence maintenant.",
    ].join(" ");
  }
  if (task === 3) {
    return [
      exam ? "Merci. Nous passons à la troisième et dernière tâche :" : "Bonjour. Nous allons faire la troisième tâche de l'épreuve d'expression orale :",
      "l'expression d'un point de vue. Elle dure quatre minutes trente, sans préparation.",
      "Je vais vous lire une question, et vous me donnerez votre opinion. Défendez-la avec des arguments et des exemples, et parlez le plus longtemps possible : si vous vous arrêtez, je vous poserai une question pour vous relancer.",
      `Voici le sujet. ${p}`,
      "Je vous écoute.",
    ].join(" ");
  }
  return "";
}

// Tâche 3 is a monologue: the examiner steps in only when the candidate falls
// silent, at most this many times. After that the candidate keeps the floor
// alone, and silence costs them (shown live, and in the feedback).
export const T3_MAX_RELANCES = 2;

// End of the Tâche 2 preparation: the examiner hands over to the candidate,
// who opens the role-play.
export const PREP_END_LINE = "Le temps de préparation est terminé. Nous commençons la conversation : c'est à vous.";

// The Tâche 1 and 3 briefings end on the question itself, so the dialogue
// that is answered and graded starts with them. Tâche 2's briefing is an
// announcement: the role-play only starts once the candidate speaks.
export const openingIsQuestion = (task) => task === 1 || task === 3;

// Said when the task ends: on time (the examiner cuts in, as on exam day) or
// at the safety ceiling of exchanges.
export const CLOSING_TIME_UP = "Merci, le temps est écoulé. Nous nous arrêtons ici.";
export const CLOSING_DONE = "Merci, c'est terminé pour cette partie.";
