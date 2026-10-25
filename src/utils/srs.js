// Spaced repetition for « Mon lexique » — a Leitner system, deliberately
// simple: five boxes, each with a longer wait. A word known at review moves up
// a box and comes back later; a word forgotten drops to the first box and
// comes back tomorrow. Pure functions, no I/O (tests/vocab-deck.test.mjs).

// Days to wait before a word in box n (1-5) is due again.
export const INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 35 };
export const MAX_BOX = 5;
// From this box on, a word counts as « maîtrisé » in the stats.
export const MASTERED_BOX = 4;

const DAY = 86_400_000;
// Due dates fall at the START of a local day, so a word due "in 3 days" is
// there from the morning of that day, not at the minute it was reviewed.
export const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const addDays = (t, n) => startOfDay(t) + n * DAY;

// A new card is due right away: adding a word is the moment to learn it.
export const newCard = (entry, now = Date.now()) => ({
  term: String(entry.term || "").trim(),
  def: String(entry.def || "").trim(),
  example: String(entry.example || "").trim(),
  source: entry.source || "vocab",
  box: 1,
  due: now,
  reviews: 0,
  lapses: 0,
  added: now,
});

// The card after one review. `knew` is the learner's own verdict.
export function review(card, knew, now = Date.now()) {
  const box = knew ? Math.min(MAX_BOX, (card.box || 1) + 1) : 1;
  return {
    ...card,
    box,
    due: addDays(now, INTERVAL_DAYS[box]),
    reviews: (card.reviews || 0) + 1,
    lapses: (card.lapses || 0) + (knew ? 0 : 1),
  };
}

export const isDue = (card, now = Date.now()) => (card.due ?? 0) <= now;

// The review queue: due cards, the most overdue and the weakest first.
export const dueCards = (cards, now = Date.now()) =>
  cards.filter((c) => isDue(c, now)).sort((a, b) => (a.box - b.box) || (a.due - b.due));

// When the next card falls due, for the « rien à réviser » message.
export const nextDue = (cards, now = Date.now()) => {
  const later = cards.filter((c) => !isDue(c, now)).map((c) => c.due);
  return later.length ? Math.min(...later) : null;
};

export const deckStats = (cards, now = Date.now()) => ({
  total: cards.length,
  due: cards.filter((c) => isDue(c, now)).length,
  mastered: cards.filter((c) => c.box >= MASTERED_BOX).length,
});

// Same word, however it was typed: the deck holds one card per term.
export const termKey = (term) => String(term || "").trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
