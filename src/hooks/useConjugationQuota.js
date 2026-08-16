import { useState, useEffect, useRef, useCallback } from "react";
import { ROLES } from "@/auth/rbac";
import { readUsage, writeUsage } from "@/services/conjugationQuotaService";
import { DAILY_LIMIT_SECONDS, WARN_AT_SECONDS_LEFT, todayKey, nextResetAt } from "@/utils/conjugationQuota";

// How often the running total is pushed to the backend. Every second would be
// a request per second per candidate; only on unmount would lose the whole
// session to a closed tab.
const FLUSH_EVERY_SECONDS = 30;

// The free tier's ten minutes a day on the conjugation practice column.
//
// The clock runs while the page is mounted AND the tab is visible. Visibility
// is part of it deliberately: "open the page" means looking at it, and a tab
// forgotten in the background overnight would otherwise burn a candidate's
// next three days before they ever saw an exercise.
//
// Only ROLES.FREE_USER is metered. Premium, admin and owner get `metered:
// false` and the hook does no work at all for them — no timer, no reads, no
// writes, so an unmetered account never touches the table.
export function useConjugationQuota(role, userId) {
  const metered = role === ROLES.FREE_USER;

  const [seconds, setSeconds] = useState(0);
  const [loaded, setLoaded] = useState(!metered);
  const [warned, setWarned] = useState(false);
  const [day, setDay] = useState(todayKey);

  // The authoritative counter. State is for rendering; this is what the timer
  // increments and what gets flushed, so a re-render can never lose a second.
  const secondsRef = useRef(0);
  const lastFlushed = useRef(0);

  const flush = useCallback(() => {
    if (!metered) return;
    if (secondsRef.current === lastFlushed.current) return;
    lastFlushed.current = secondsRef.current;
    writeUsage(userId, secondsRef.current);
  }, [metered, userId]);

  // Today's total, once.
  useEffect(() => {
    if (!metered) return undefined;
    let live = true;
    readUsage(userId).then(({ seconds: used }) => {
      if (!live) return;
      secondsRef.current = used;
      lastFlushed.current = used;
      setSeconds(used);
      setWarned(DAILY_LIMIT_SECONDS - used <= WARN_AT_SECONDS_LEFT);
      setLoaded(true);
    });
    return () => { live = false; };
  }, [metered, userId]);

  // The clock. One interval for ticking and flushing both, so they can never
  // drift apart.
  useEffect(() => {
    if (!metered || !loaded) return undefined;

    const id = setInterval(() => {
      if (document.hidden) return; // not being looked at → not being used
      // A tab left open across midnight starts the new day at zero rather
      // than carrying yesterday's total into it.
      const now = todayKey();
      if (now !== day) {
        secondsRef.current = 0;
        lastFlushed.current = 0;
        setSeconds(0);
        setWarned(false);
        setDay(now);
        return;
      }
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current % FLUSH_EVERY_SECONDS === 0) flush();
    }, 1000);

    return () => clearInterval(id);
  }, [metered, loaded, day, flush]);

  // Flush on the way out: tab hidden, page closed, component unmounted. The
  // visibility handler is what catches a phone being locked, which never fires
  // unload at all.
  useEffect(() => {
    if (!metered) return undefined;
    const onHide = () => { if (document.hidden) flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [metered, flush]);

  // Stable identity: the page acknowledges the warning from inside an effect,
  // and a fresh function every render would re-run that effect every second.
  const markWarned = useCallback(() => setWarned(true), []);

  const left = Math.max(0, DAILY_LIMIT_SECONDS - seconds);

  return {
    metered,
    // Until today's total has been read, the page must not decide anything:
    // rendering the paywall on a not-yet-loaded zero would flash a wall at a
    // candidate who has minutes left.
    ready: loaded,
    seconds,
    left,
    limit: DAILY_LIMIT_SECONDS,
    exhausted: metered && loaded && left <= 0,
    // True the moment the candidate crosses into the last five minutes, and
    // only then — the page turns this into one toast, not a recurring one.
    shouldWarn: metered && loaded && left > 0 && left <= WARN_AT_SECONDS_LEFT && !warned,
    markWarned,
    resetAt: nextResetAt(),
  };
}
