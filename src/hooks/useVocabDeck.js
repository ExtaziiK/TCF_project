import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { listDeck, addToDeck, reviewInDeck, removeFromDeck, DECK_CHANGED } from "@/services/vocabDeckService";
import { deckStats, dueCards, termKey } from "@/utils/srs";

// The learner's « Mon lexique » deck, shared by every component that shows it
// (the vocabulary page, the model answers' « + Mon lexique » chips): a change
// made in one is announced (DECK_CHANGED) and reloaded by all the others.
export function useVocabDeck() {
  const { user } = useApp();
  const userId = user?.id || null;
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await listDeck(userId);
    setCards(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
    window.addEventListener(DECK_CHANGED, reload);
    return () => window.removeEventListener(DECK_CHANGED, reload);
  }, [reload]);

  const keys = useMemo(() => new Set(cards.map((c) => termKey(c.term))), [cards]);

  return {
    loading,
    cards,
    stats: deckStats(cards),
    due: dueCards(cards),
    has: (term) => keys.has(termKey(term)),
    add: (entry) => addToDeck(userId, entry),
    review: (card, knew) => reviewInDeck(userId, card, knew),
    remove: (term) => removeFromDeck(userId, term),
  };
}
