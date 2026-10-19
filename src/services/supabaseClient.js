export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

// supabase-js is about half the app's startup JavaScript, and no page needs it
// to draw its first frame: every query runs from an effect or a handler. So
// the client is its own chunk, fetched on first use, and the first paint no
// longer waits for it to download and evaluate. Every service calls
// `(await getSupabase())` instead of holding a module-level client. One
// promise per page load, so there is still exactly one client.
//
// Never import supabaseInstance.js statically: that pulls supabase-js back
// into the entry bundle.
let client = null;
export function getSupabase() {
  client ||= import("@/services/supabaseInstance").then((m) => m.supabase);
  return client;
}

// Whether the URL carries tokens for supabase-js to exchange: an OAuth
// return (?code=) or an email link (#access_token=, ?token_hash=). Until it
// has, the page cannot know who is signed in.
export function hasAuthRedirect() {
  const { search, hash } = window.location;
  return /[?&](code|token_hash)=/.test(search) || /access_token=|error_description=/.test(hash);
}

// Whether this browser holds a saved session, answered synchronously from
// supabase-js's own storage key (its default, `sb-<project ref>-auth-token`).
// Lets the first frame guess "visitor" without waiting for getSession() — the
// shell uses it to lay out the announcement bar before auth has resolved.
const SESSION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
export function hasStoredSession() {
  try { return !!window.localStorage.getItem(SESSION_KEY); } catch { return false; }
}
