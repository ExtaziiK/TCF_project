import { supabase } from "@/services/supabaseClient";
import { TERMS_VERSION } from "@/constants/terms";

// Consent records for the conditions générales (terms_acceptances, see
// supabase/migrations/20260730_terms_acceptances.sql). The table is append-only
// and stamps its own timestamp, IP and user-agent server-side, so this module
// only ever says "this user accepted this version, through this path" — every
// other field is out of the browser's hands.
//
// The email-signup path does NOT go through here: its row is written by the
// on_auth_user_created_terms trigger from the metadata authService.signUp()
// sends, which keeps the record server-authored even though signup is a
// client-side call.

// A database that hasn't had the migration applied yet: no table, or PostgREST
// not yet aware of it. Reported separately so callers can carry on instead of
// failing a signup over bookkeeping that isn't installed.
const isMissingTable = (error) => error?.code === "42P01" || error?.code === "PGRST205";

// Records acceptance of the current version. Safe to call twice — the unique
// (user_id, version) index makes a repeat a no-op rather than a second row, and
// 23505 (unique violation) therefore counts as success.
export async function recordTermsAcceptance(source) {
  const { error } = await supabase.from("terms_acceptances").insert({ version: TERMS_VERSION, source });
  if (!error || error.code === "23505") return { ok: true };
  if (isMissingTable(error)) return { ok: false, unavailable: true, error: error.message };
  return { ok: false, error: error.message };
}

// Has this user accepted the version currently published? Returns null when the
// question can't be answered (migration not applied, network down) so callers
// can fail open: nobody should be locked out of the app by a failed lookup.
export async function hasAcceptedCurrentTerms(userId) {
  if (!userId) return null;
  const { count, error } = await supabase
    .from("terms_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId) // admins can read every row — scope the check to this account
    .eq("version", TERMS_VERSION);
  if (error) return null;
  return (count || 0) > 0;
}
