import { getSupabase } from "@/services/supabaseClient";
import { getActiveProfileId } from "@/utils/activeProfile";
import { newCard, review as reviewCard, termKey } from "@/utils/srs";

// « Mon lexique » storage (supabase/migrations/20261024_vocab_deck.sql).
//
// Supabase first; the browser when the table is missing (migration not applied
// yet) or nobody is signed in — the same fallback the dictée history uses, so
// the feature works from day one and simply starts following the learner
// across devices once the table exists.

export const DECK_CHANGED = "passerelle:vocab-deck-changed";
const announce = () => {
  try { window.dispatchEvent(new window.Event(DECK_CHANGED)); } catch { /* not in a browser */ }
};

const LOCAL_KEY = (userId) => `passerelle.vocab.deck.${userId || "anon"}.${getActiveProfileId() || "main"}`;
const local = {
  read(userId) {
    try { return JSON.parse(window.localStorage.getItem(LOCAL_KEY(userId))) || []; } catch { return []; }
  },
  write(userId, cards) {
    try { window.localStorage.setItem(LOCAL_KEY(userId), JSON.stringify(cards.slice(0, 2000))); } catch { /* full or blocked */ }
  },
};

// Once the table is known to be missing, stop asking for this page load.
let tableMissing = false;
const isMissingTable = (error) =>
  !!error && (error.code === "42P01" || error.code === "PGRST205" || /vocab_deck|schema cache/i.test(error.message || ""));

const fromRow = (r) => ({
  term: r.term,
  def: r.def || "",
  example: r.example || "",
  source: r.source || "vocab",
  box: r.box,
  due: new Date(r.due_at).getTime(),
  reviews: r.reviews || 0,
  lapses: r.lapses || 0,
  added: new Date(r.created_at).getTime(),
});

const toRow = (card) => ({
  term: card.term.slice(0, 160),
  term_key: termKey(card.term).slice(0, 160),
  def: (card.def || "").slice(0, 600),
  example: (card.example || "").slice(0, 600),
  source: (card.source || "vocab").slice(0, 20),
  box: card.box,
  due_at: new Date(card.due).toISOString(),
  reviews: card.reviews || 0,
  lapses: card.lapses || 0,
});

const scope = (q) => {
  const pid = getActiveProfileId();
  return pid ? q.eq("profile_id", pid) : q.is("profile_id", null);
};

export async function listDeck(userId) {
  if (!userId || tableMissing) return local.read(userId);
  const { data, error } = await scope((await getSupabase()).from("vocab_deck").select("*").eq("user_id", userId)).order("due_at");
  if (error) {
    if (isMissingTable(error)) tableMissing = true;
    return local.read(userId);
  }
  return (data || []).map(fromRow);
}

// Adds a word if it is not already in the deck. → true when it was added.
export async function addToDeck(userId, entry) {
  const card = newCard(entry);
  if (!card.term) return false;
  const key = termKey(card.term);
  if (!userId || tableMissing) {
    const cards = local.read(userId);
    if (cards.some((c) => termKey(c.term) === key)) return false;
    local.write(userId, [card, ...cards]);
    announce();
    return true;
  }
  const row = { ...toRow(card), user_id: userId, profile_id: getActiveProfileId() };
  const { error } = await (await getSupabase()).from("vocab_deck").upsert(row, { onConflict: "user_id,profile_id,term_key", ignoreDuplicates: true });
  if (error) {
    if (isMissingTable(error)) { tableMissing = true; return addToDeck(userId, entry); }
    console.warn("vocab_deck:", error.message);
    return false;
  }
  announce();
  return true;
}

// Records one review and returns the updated card.
export async function reviewInDeck(userId, card, knew) {
  const next = reviewCard(card, knew);
  if (!userId || tableMissing) {
    local.write(userId, local.read(userId).map((c) => (termKey(c.term) === termKey(card.term) ? next : c)));
  } else {
    const { box, due_at: dueAt, reviews, lapses } = toRow(next);
    const { error } = await scope((await getSupabase()).from("vocab_deck").update({ box, due_at: dueAt, reviews, lapses }).eq("user_id", userId).eq("term_key", termKey(card.term)));
    if (error) console.warn("vocab_deck:", error.message);
  }
  announce();
  return next;
}

export async function removeFromDeck(userId, term) {
  if (!userId || tableMissing) {
    local.write(userId, local.read(userId).filter((c) => termKey(c.term) !== termKey(term)));
  } else {
    const { error } = await scope((await getSupabase()).from("vocab_deck").delete().eq("user_id", userId).eq("term_key", termKey(term)));
    if (error) console.warn("vocab_deck:", error.message);
  }
  announce();
}
