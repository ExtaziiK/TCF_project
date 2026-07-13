import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";

// Validates the caller's Supabase session (Bearer token) and returns the user.
// The Expression workshops are Premium in the UI; requiring a real session
// here keeps the billable Groq key from being driven by anonymous traffic
// that never loaded the app.
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) throw new HttpError(401, "Authentication required.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Invalid or expired session.");
  const user = data.user;

  // Single active session ("last login wins"): once the account has claimed a
  // device session, the caller must present the matching id. A superseded
  // device — whose id was overwritten by a newer login — is refused here even
  // though its JWT hasn't expired yet, so it can't keep driving the billable
  // endpoint. Accounts with no claim on record (null, e.g. pre-migration) are
  // left unaffected. Errors reading the column fail open for the same reason.
  const { data: profile } = await admin.from("profiles").select("active_session_id").eq("id", user.id).maybeSingle();
  const active = profile?.active_session_id || null;
  if (active) {
    const presented = String(req.headers["x-device-session"] || "").trim();
    if (presented !== active) throw new HttpError(401, "Session ouverte sur un autre appareil.");
  }
  return user;
}
