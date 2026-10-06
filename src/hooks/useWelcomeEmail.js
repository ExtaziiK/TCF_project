import { useEffect, useRef } from "react";
import { requestWelcomeEmail } from "@/services/authService";

// Asks the server to send the welcome email as soon as a NEW account has a
// session — which is the end of signing up, whichever way it happened: the
// emailed code confirmed, or a first Google sign-in.
//
// The server is what guarantees "once" (welcome_email_sent_at on the account)
// and refuses accounts older than its window. This side only avoids calling
// for nothing: old accounts are skipped, and a device that already got an
// answer remembers it.
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // WELCOME_WINDOW_DAYS in api/_lib/welcomeTemplate.js
const key = (id) => `tcf_welcome_done:${id}`;

export function useWelcomeEmail(user) {
  const asked = useRef(null);
  const userId = user?.id;
  const createdAt = user?.createdAt;
  useEffect(() => {
    if (!userId || !createdAt || asked.current === userId) return;
    if (Date.now() - Date.parse(createdAt) > WINDOW_MS) return;
    try { if (localStorage.getItem(key(userId))) return; } catch { /* storage unavailable */ }
    asked.current = userId;
    requestWelcomeEmail().then((r) => {
      // Sent, or settled for good (already sent / too old): nothing left to do
      // here. A failure, or the email being switched off, is left unmarked so
      // a later visit can still get it.
      if (r.ok && r.reason !== "disabled" && r.reason !== "unconfirmed") { try { localStorage.setItem(key(userId), "1"); } catch { /* storage unavailable */ } }
    });
  }, [userId, createdAt]);
}
