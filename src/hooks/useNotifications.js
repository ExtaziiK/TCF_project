import { useEffect, useMemo, useRef, useState } from "react";
import { NOTIFS } from "@/constants/gamification";

// Per-user notification state, persisted to localStorage. The catalogue
// (NOTIFS) is seed content; here we only track how the user has interacted
// with each entry by id ({ read, dismissed }) and derive the visible list and
// the unread count from that. Same resilience/naming pattern as the other
// local stores (quiz results, exam attempts).
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
    /* storage full/blocked — read state just won't persist */
  }
}

export function useNotifications(userId) {
  const [state, setState] = useState(() => loadState(userId));
  const uidRef = useRef(userId);

  // Reload when the signed-in user changes (login / logout / account switch).
  useEffect(() => {
    uidRef.current = userId;
    setState(loadState(userId));
  }, [userId]);

  // Persist on change. Keyed on `state` only: `uidRef` always points at the
  // current user, and on a user switch `state` is unchanged in that render, so
  // one user's state is never written under another user's key.
  useEffect(() => {
    saveState(uidRef.current, state);
  }, [state]);

  const notifications = useMemo(
    () =>
      NOTIFS.filter((n) => !state[n.id]?.dismissed).map((n) => ({ ...n, read: !!state[n.id]?.read })),
    [state]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markRead = (id) => setState((s) => ({ ...s, [id]: { ...s[id], read: true } }));
  const dismiss = (id) => setState((s) => ({ ...s, [id]: { ...s[id], read: true, dismissed: true } }));
  const markAllRead = () =>
    setState((s) => {
      const next = { ...s };
      for (const n of NOTIFS) next[n.id] = { ...next[n.id], read: true };
      return next;
    });

  return { notifications, unreadCount, markRead, dismiss, markAllRead };
}
