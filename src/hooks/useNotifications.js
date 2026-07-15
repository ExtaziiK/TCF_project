import { useEffect, useMemo, useRef, useState } from "react";
import { listAttempts } from "@/services/examService";
import { listQuizResults } from "@/services/quizResultsService";
import { computeProgress } from "@/services/progressService";
import { deriveNotifications, timeAgo } from "@/utils/notifications";

// Per-user notification state, persisted to localStorage. The notifications
// themselves are *derived from real data* (deriveNotifications over the same
// progress engine the dashboard uses); here we only remember how the user has
// interacted with each one, keyed by its stable id:
//   { [id]: { read, dismissed, firstSeen } }
// firstSeen is stamped the first time a notification surfaces, which drives the
// relative "il y a…" label and the newest-first ordering.
const STORAGE_KEY = (userId) => `passerelle-notifications-${userId || "anon"}`;

function loadState(userId) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(userId))) || {};
  } catch {
    return {};
  }
}

function saveState(userId, state) {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(state));
  } catch {
    /* storage full/blocked — interaction state just won't persist */
  }
}

// `refreshKey` (the current route) lets the bell re-derive as the user moves
// through the app — e.g. right after finishing a quiz and landing elsewhere —
// without the persistent nav ever unmounting.
export function useNotifications(userId, refreshKey) {
  const [state, setState] = useState(() => loadState(userId));
  const [progress, setProgress] = useState(null);
  const uidRef = useRef(userId);

  // Reload interaction state when the signed-in user changes.
  useEffect(() => {
    uidRef.current = userId;
    setState(loadState(userId));
  }, [userId]);

  // Persist interaction state. Keyed on `state` only: `uidRef` always points at
  // the current user, and on a user switch `state` is unchanged in that render,
  // so one user's state is never written under another user's key.
  useEffect(() => {
    saveState(uidRef.current, state);
  }, [state]);

  // Recompute the user's real progress from their stored history.
  useEffect(() => {
    if (!userId) { setProgress(null); return; }
    let live = true;
    Promise.all([listAttempts(userId), listQuizResults(userId)]).then(
      ([{ attempts }, { results }]) => { if (live) setProgress(computeProgress({ results, attempts })); }
    );
    return () => { live = false; };
  }, [userId, refreshKey]);

  const facts = useMemo(() => deriveNotifications(progress), [progress]);
  const factsKey = facts.map((f) => f.id).join("|");

  // Stamp firstSeen on every newly surfaced notification. Runs only when the
  // set of ids changes; stamping doesn't change the id set, so it settles in
  // one pass and never loops.
  useEffect(() => {
    if (!facts.length) return;
    setState((s) => {
      let changed = false;
      const next = { ...s };
      const nowIso = new Date().toISOString();
      for (const f of facts) {
        if (!next[f.id]?.firstSeen) { next[f.id] = { ...next[f.id], firstSeen: nowIso }; changed = true; }
      }
      return changed ? next : s;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factsKey]);

  const notifications = useMemo(() => {
    const now = Date.now();
    return facts
      .filter((f) => !state[f.id]?.dismissed)
      .map((f) => {
        const seen = state[f.id]?.firstSeen;
        return { ...f, read: !!state[f.id]?.read, time: seen ? timeAgo(seen, now) : "à l'instant" };
      })
      .sort((a, b) => new Date(state[b.id]?.firstSeen || 0) - new Date(state[a.id]?.firstSeen || 0));
  }, [facts, state]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markRead = (id) => setState((s) => ({ ...s, [id]: { ...s[id], read: true } }));
  const dismiss = (id) => setState((s) => ({ ...s, [id]: { ...s[id], read: true, dismissed: true } }));
  const markAllRead = () =>
    setState((s) => {
      const next = { ...s };
      for (const f of facts) next[f.id] = { ...next[f.id], read: true };
      return next;
    });

  return { notifications, unreadCount, markRead, dismiss, markAllRead };
}
