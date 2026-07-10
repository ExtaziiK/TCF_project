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
  return data.user;
}
