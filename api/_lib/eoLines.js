// What the examiner says out loud in the Expression orale simulation, outside
// the AI-generated replies: the line that opens each tâche, and the closings.
// Shared by api/expression-orale.js (which voices them) and the page (which
// falls back to browser TTS with the same text when the server can't voice
// them), so both always say the same thing.
//
// On exam day the examiner speaks first: greets, explains the 12 minutes and
// asks the Tâche 1 question out loud; announces the Tâche 2 subject and its
// two minutes of preparation (then the candidate opens the role-play); and
// gives the Tâche 3 subject before the candidate argues.

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 1000);

// Official timings, in seconds. Tâche 2 is 5 min 30 IN ALL: 2 min of
// preparation, then 3 min 30 of interaction. 2:00 + 5:30 + 4:30 = 12 min.
export const EO_TIMINGS = {
  1: { prep: 0, dur: 120 },
  2: { prep: 120, dur: 210 },
  3: { prep: 0, dur: 270 },
};

// The line that opens a tâche, or "" when the candidate speaks first (Tâche 2
// outside the full exam: the subject is on screen, the role-play is theirs to
// open). `exam` is the back-to-back 12-minute run of the TCF blanc, where the
// examiner also welcomes the candidate and announces each part.
export function openingLine(task, prompt, { exam = false } = {}) {
  const p = clean(prompt);
  if (task === 1) {
    return exam
      ? `Bonjour. L'épreuve d'expression orale dure douze minutes et comporte trois parties. L'entretien est enregistré. Nous commençons par la première partie. ${p}`
      : `Bonjour. ${p}`;
  }
  if (task === 2) {
    return exam
      ? "Merci. Nous passons à la deuxième partie. Voici votre sujet. Vous avez deux minutes pour vous préparer, puis c'est vous qui commencerez la conversation."
      : "";
  }
  if (task === 3) {
    return `${exam ? "Merci. Nous passons à la troisième et dernière partie. " : ""}Voici le sujet : ${p} Je vous écoute.`;
  }
  return "";
}

// Tâche 2's opening line is an announcement, not part of the role-play: it
// never enters the dialogue that is answered and graded. The Tâche 1 and 3
// openings carry the question itself, so they do.
export const openingIsQuestion = (task) => task === 1 || task === 3;

// Said when the task ends: on time (the examiner cuts in, as on exam day) or
// at the safety ceiling of exchanges.
export const CLOSING_TIME_UP = "Merci, le temps est écoulé. Nous nous arrêtons ici.";
export const CLOSING_DONE = "Merci, c'est terminé pour cette partie.";
