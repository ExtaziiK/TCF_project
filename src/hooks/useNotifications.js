import { useEffect, useMemo, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { listAttempts } from "@/services/examService";
import { listQuizResults } from "@/services/quizResultsService";
import { computeProgress } from "@/services/progressService";
import { listUnreadReplies, markRepliesRead } from "@/services/supportService";
import { deriveNotifications, timeAgo } from "@/utils/notifications";

// Two kinds of notification, deliberately kept apart:
//
// - DERIVED ones (deriveNotifications over the same progress engine the
//   dashboard uses) are recomputed from the member's own history, so only the
//   interaction state is stored, in localStorage, keyed by a stable id:
//     { [id]: { read, dismissed, firstSeen } }
//   firstSeen is stamped the first time one surfaces, which drives the relative
//   "il y a…" label and the newest-first ordering.
//
// - SENT ones come from the server: an answer from the team to a message the
//   member wrote (contact_replies). Those are not derivable from anything on
//   the device, and their read state belongs in the database — read on a phone
//   must be read on a laptop — so they never touch localStorage. They are
//   fetched unread, shown first, and disappear once read.
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
// One line of the reply, enough to recognise which conversation it answers
// without turning the bell into a mail client.
const EXCERPT = 70;
const excerpt = (body) => {
  const flat = String(body || "").replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT ? `${flat.slice(0, EXCERPT - 1)}…` : flat;
};

export function useNotifications(userId, refreshKey) {
  const [state, setState] = useState(() => loadState(userId));
  const [progress, setProgress] = useState(null);
  const [replies, setReplies] = useState([]);
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

  // Answers from the team. Re-read on every route change, like the progress
  // above, so a reply that lands mid-session shows up without a reload.
  useEffect(() => {
    if (!userId) { setReplies([]); return; }
    let live = true;
    listUnreadReplies(userId).then((r) => { if (live) setReplies(r.replies); });
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
    const derived = facts
      .filter((f) => !state[f.id]?.dismissed)
      .map((f) => {
        const seen = state[f.id]?.firstSeen;
        return { ...f, read: !!state[f.id]?.read, time: seen ? timeAgo(seen, now) : "à l'instant" };
      })
      .sort((a, b) => new Date(state[b.id]?.firstSeen || 0) - new Date(state[a.id]?.firstSeen || 0));

    // Someone wrote to this member personally: it goes above the badges and
    // streak nudges, whatever their timestamps say. `route` sends the click to
    // the profile page, where the whole conversation is.
    const answers = replies.map((r) => ({
      id: `reply-${r.id}`,
      replyId: r.id,
      icon: Mail,
      t: `Notre équipe a répondu à votre message : « ${excerpt(r.body)} »`,
      time: timeAgo(r.created_at, now),
      read: false,
      route: "profile",
    }));
    return [...answers, ...derived];
  }, [facts, state, replies]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // A server-sent answer is read in the database, not in localStorage, and
  // leaves the list as soon as it is — there is nothing to keep showing.
  const forget = (id) => {
    const replyId = replies.find((r) => `reply-${r.id}` === id)?.id;
    if (replyId == null) return false;
    setReplies((list) => list.filter((r) => r.id !== replyId));
    markRepliesRead([replyId]);
    return true;
  };

  const markRead = (id) => { if (!forget(id)) setState((s) => ({ ...s, [id]: { ...s[id], read: true } })); };
  const dismiss = (id) => { if (!forget(id)) setState((s) => ({ ...s, [id]: { ...s[id], read: true, dismissed: true } })); };
  const markAllRead = () => {
    if (replies.length) {
      markRepliesRead(replies.map((r) => r.id));
      setReplies([]);
    }
    setState((s) => {
      const next = { ...s };
      for (const f of facts) next[f.id] = { ...next[f.id], read: true };
      return next;
    });
  };

  return { notifications, unreadCount, markRead, dismiss, markAllRead };
}
