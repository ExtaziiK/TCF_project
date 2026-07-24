import { createClient } from "@supabase/supabase-js";

// Deletes a brand-new OAuth account that was created by signing in with Google
// on the LOGIN page. The app only creates accounts through explicit
// registration, so a Google identity with no existing account is refused there
// and the row Supabase auto-created (auth.users + its profile, via the
// on_auth_user_created trigger) is removed — leaving the address free to
// register properly later.
//
// Safety: this only ever deletes the CALLER'S OWN account (identified by their
// just-issued access token), and only when it was created in the last few
// minutes (a fresh OAuth signup). An established account can never be deleted
// here, even if the client misfires.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const FRESH_WINDOW_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return res.status(401).json({ error: "Invalid session." });

  const created = Date.parse(user.created_at || "");
  if (!Number.isFinite(created) || Date.now() - created > FRESH_WINDOW_MS) {
    // Not a fresh account — never delete an established one from here.
    return res.status(200).json({ ok: false, kept: true });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return res.status(502).json({ error: `Suppression refusée : ${delErr.message}` });
  return res.status(200).json({ ok: true });
}
