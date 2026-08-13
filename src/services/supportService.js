import { supabase } from "@/services/supabaseClient";

// The member's side of the contact form: the messages they sent us and the
// answers they got back (contact_messages + contact_replies, see
// supabase/migrations/20260813_contact_replies.sql).
//
// Everything goes through the anon/authenticated key — RLS is what scopes it to
// the caller: a member reads the messages they filed while signed in and the
// replies attached to them, and the only column they may write is `read_at` on
// their own reply (a column privilege, not a policy). No service-role endpoint
// is needed to read your own mail.
//
// A message sent by a signed-out visitor carries no user_id and therefore
// belongs to nobody: it never appears here, and it is answered by email.

// A missing table (migration not applied) must not break the profile page or
// the nav bell — both treat it as "no conversation yet".
const missing = (error) => !!error && (error.code === "42P01" || /contact_replies|contact_messages/.test(error.message || ""));

const toThread = (m, replies) => ({
  id: m.id,
  subject: m.subject || "",
  message: m.message,
  status: m.status,
  createdAt: m.created_at,
  replies: (replies[m.id] || []).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  })),
});

// Every conversation the member has with us, newest first.
export async function listMyThreads(userId) {
  if (!userId) return { ok: true, threads: [] };
  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id, subject, message, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { ok: false, unavailable: missing(error), threads: [] };
  if (!messages.length) return { ok: true, threads: [] };

  const { data: replyRows, error: replyError } = await supabase
    .from("contact_replies")
    .select("id, message_id, body, created_at, read_at")
    .in("message_id", messages.map((m) => m.id))
    .order("created_at", { ascending: true });
  if (replyError) return { ok: false, unavailable: missing(replyError), threads: [] };

  const byMessage = {};
  for (const r of replyRows) (byMessage[r.message_id] ||= []).push(r);
  return { ok: true, threads: messages.map((m) => toThread(m, byMessage)) };
}

// Unread answers, for the nav bell. Deliberately its own small query rather
// than a filter over listMyThreads: it runs on every page load, and the partial
// index on (message_id) where read_at is null makes it cheap.
//
// The join is NOT redundant with RLS. The read policy is "own message OR
// admin", because the dashboard reads the same table — so for an admin's own
// account, RLS alone would light up their bell with every reply sent to every
// member. Ownership is asserted here rather than inferred from the policy.
export async function listUnreadReplies(userId) {
  if (!userId) return { ok: true, replies: [] };
  const { data, error } = await supabase
    .from("contact_replies")
    .select("id, message_id, body, created_at, contact_messages!inner(user_id)")
    .eq("contact_messages.user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return { ok: false, unavailable: missing(error), replies: [] };
  return { ok: true, replies: data.map(({ contact_messages, ...r }) => r) }; // eslint-disable-line no-unused-vars
}

// Marks answers as read. Only `read_at` is writable by the member, so this is
// the whole of what they can change about a reply.
export async function markRepliesRead(ids = []) {
  if (!ids.length) return { ok: true };
  const { error } = await supabase
    .from("contact_replies")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
  return { ok: !error };
}
