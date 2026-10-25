// A one-shot "open this subject" note passed from one page to another — the
// Modèle de réponse page sends the candidate to the workshop or the dictée on
// the SAME subject. Kept in sessionStorage (this tab only) and read once, so a
// later visit to either page starts as usual.

const KEY = (kind) => `passerelle.handoff.${kind}`;

export function handOff(kind, value) {
  try { window.sessionStorage.setItem(KEY(kind), JSON.stringify({ ...value, at: Date.now() })); } catch { /* the link still opens the page */ }
}

// Reads and clears it. A note older than a minute is ignored: it was left by a
// click that never reached the page.
export function takeHandoff(kind) {
  try {
    const raw = window.sessionStorage.getItem(KEY(kind));
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY(kind));
    const v = JSON.parse(raw);
    return v && Date.now() - (v.at || 0) < 60_000 ? v : null;
  } catch {
    return null;
  }
}
