// Best-score persistence per quiz (localStorage). Used by the quiz engine
// to record results and by the quiz lists to show a "meilleur score" badge.
const key = (storageKey) => `passerelle-best-${storageKey}`;

export function getBestScore(storageKey) {
  if (!storageKey) return null;
  try {
    return JSON.parse(localStorage.getItem(key(storageKey)));
  } catch {
    return null;
  }
}

export function saveBestScore(storageKey, ok, total) {
  if (!storageKey || !total) return;
  try {
    const pct = Math.round((ok / total) * 100);
    const prev = getBestScore(storageKey);
    if (!prev || pct > prev.pct) {
      localStorage.setItem(key(storageKey), JSON.stringify({ pct, ok, total, at: new Date().toISOString() }));
    }
  } catch {
    // storage unavailable (private mode) — scores just aren't remembered
  }
}
