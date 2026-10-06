import { createClient } from "@supabase/supabase-js";
import { requireModerator } from "../auth.js";
import { HttpError } from "../groq.js";
import { patchMetadata, audit, PLAN_LABELS } from "./users.js";

// The DZD payment-request queue, for the moderator role (and admins, whose
// "Demandes" tab approves through here too, so there is one approval path).
//
//   GET  /api/admin/moderation                          → { requests }
//   GET  /api/admin/moderation?receipt=<requestId>      → { url }
//   POST /api/admin/moderation { action: "approve", requestId } → { ok }
//
// A moderator's whole back-office power is this file. They hold no database
// rights of their own (is_admin() is false for them), so everything runs with
// the service-role key and is narrowed here instead:
//   - the list carries only what checking a payment needs, and no rejected
//     requests (refusing is the owner's call, not theirs);
//   - a receipt is signed by REQUEST id, never by a storage path the caller
//     names, so no other object in the bucket is reachable;
//   - approving takes a request id and nothing else — the plan, its duration
//     and the account it lands on are read from the row. Unlike the admin
//     "set-plan" action, there is no way to grant an arbitrary plan to an
//     arbitrary user from here.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const isStaffRole = (actor) => ["admin", "owner"].includes(actor.app_metadata?.role);

// Same parser as src/utils/currency.js parseDzd: "2 600 DA" → 2600.
function parseDzd(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const m = String(value).replace(/\s/g, "").replace(",", ".").match(/\d+(\.\d+)?/);
  const n = m ? parseFloat(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
}

const LIST_COLUMNS = "id, user_id, name, email, plan, plan_days, method, amount_dzd, reference, notes, receipt_path, status, created_at";

async function handleGet(req, res) {
  if (req.query.receipt) {
    const { data: row } = await admin
      .from("subscription_requests")
      .select("receipt_path, status")
      .eq("id", String(req.query.receipt))
      .maybeSingle();
    if (!row?.receipt_path || row.status === "rejected") throw new HttpError(404, "Reçu indisponible.");
    const { data, error } = await admin.storage.from("receipts").createSignedUrl(row.receipt_path, 600);
    if (error || !data?.signedUrl) throw new HttpError(502, "Reçu indisponible.");
    return res.status(200).json({ url: data.signedUrl });
  }

  // approved_at only exists once 20260807_revenue.sql is applied; fall back to
  // the base columns rather than showing an empty queue.
  const query = (cols) => admin
    .from("subscription_requests")
    .select(cols)
    .in("status", ["new", "approved"])
    .order("created_at", { ascending: false })
    .limit(200);
  let { data, error } = await query(`${LIST_COLUMNS}, approved_at`);
  if (error) ({ data, error } = await query(LIST_COLUMNS));
  if (error) throw new HttpError(502, "Demandes indisponibles.");

  // Neither the storage path nor the account id leaves the server: the client
  // only needs to know whether there is a receipt to open and an account left
  // to activate.
  const requests = (data || []).map(({ receipt_path, user_id, ...r }) => ({ ...r, has_receipt: !!receipt_path, has_account: !!user_id }));
  return res.status(200).json({ requests });
}

async function approve(req, res, actor) {
  const requestId = String(req.body?.requestId || "");
  if (!requestId) throw new HttpError(400, "Demande introuvable.");

  const { data: row } = await admin
    .from("subscription_requests")
    .select("*") // "*" so amount_received_dzd is read where the revenue migration added it
    .eq("id", requestId)
    .maybeSingle();
  if (!row) throw new HttpError(404, "Demande introuvable.");
  if (row.status === "approved") throw new HttpError(409, "Cette demande est déjà approuvée.");
  // Admins may still approve a request they refused earlier; a moderator only
  // ever sees, and so only ever approves, pending ones.
  const approvable = isStaffRole(actor) ? ["new", "rejected"] : ["new"];
  if (!approvable.includes(row.status)) throw new HttpError(403, "Cette demande ne peut pas être approuvée.");
  if (!row.user_id) throw new HttpError(400, "Le compte de cette demande a été supprimé.");

  // Grant FIRST, then mark the row approved. The buyer's browser
  // (useDzActivation) remints its token once, on seeing the row approved — if
  // it saw that before the plan was written it would remint into "Basic".
  const days = Number(row.plan_days) > 0 ? Number(row.plan_days) : 0;
  const premiumUntil = days ? new Date(Date.now() + days * 24 * 3600 * 1000).toISOString() : null;
  const label = PLAN_LABELS.includes(row.plan) ? row.plan : null;
  await patchMetadata(row.user_id, { plan: "Premium", premium_until: premiumUntil, plan_label: label });

  // Stamped as the sale closes — this is what the Revenus tab counts (an
  // amount an admin corrected by hand earlier is kept). The
  // guard on the previous status keeps a double click from stamping twice.
  // Without the revenue migration the extra columns are refused, so the
  // status — the part the buyer waits on — is retried alone.
  const stamp = { approved_at: new Date().toISOString(), amount_received_dzd: row.amount_received_dzd ?? parseDzd(row.amount_dzd) };
  const update = (patch) => admin.from("subscription_requests").update({ status: "approved", ...patch }).eq("id", row.id).eq("status", row.status);
  let { error } = await update(stamp);
  if (error) ({ error } = await update({}));
  if (error) throw new HttpError(502, `Abonnement activé, mais la demande n'a pas pu être marquée : ${error.message}`);

  await audit(actor, "approve-request", row.email || row.user_id, {
    requestId: row.id, plan: row.plan, days: days || null, premium_until: premiumUntil, by: actor.app_metadata?.role,
  });
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  try {
    const actor = await requireModerator(req);
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") {
      if (req.body?.action === "approve") return await approve(req, res, actor);
      throw new HttpError(400, "Action inconnue.");
    }
    throw new HttpError(405, "Method not allowed");
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Moderation request failed." });
  }
}
