import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

export const supabase = createClient(url, anonKey);

// Whether this browser holds a saved session, answered synchronously from
// supabase-js's own storage key (its default, `sb-<project ref>-auth-token`).
// Lets the first frame guess "visitor" without waiting for getSession() — the
// shell uses it to lay out the announcement bar before auth has resolved.
const SESSION_KEY = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
export function hasStoredSession() {
  try { return !!window.localStorage.getItem(SESSION_KEY); } catch { return false; }
}
