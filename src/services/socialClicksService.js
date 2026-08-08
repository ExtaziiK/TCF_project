import { supabase } from "@/services/supabaseClient";

// How many people actually click through to YouTube, TikTok, Instagram,
// Facebook and WhatsApp — counted in our own database rather than through a
// link shortener, so constants/social.js stays the single source of truth for
// every channel URL (see 20260807_social_clicks.sql for the full reasoning).
//
// Anonymous by design: the row records the channel and where on the site it was
// clicked, nothing else.

// Fire-and-forget. The link is a normal <a target="_blank">, so the page the
// visitor is on stays alive and there is nothing to race — but the click must
// never wait on, or be blocked by, this write. A failure (offline, migration
// not applied, table dropped) costs a count and nothing else.
export function recordSocialClick(network, placement = "footer") {
  try {
    supabase.from("social_clicks").insert({ network, placement }).then(
      () => {},
      () => {},
    );
  } catch { /* never let analytics break a link */ }
}

// Per-channel totals over the window, admin-only by RLS inside the function.
// `unavailable` means the migration has not been applied yet.
export async function getSocialClickStats(days = 30) {
  const { data, error } = await supabase.rpc("social_click_stats", { since_days: days });
  if (error) return { ok: false, unavailable: true, rows: [] };

  // The function groups by (network, placement) so the owner can see whether
  // the footer or the Contact page is doing the work; fold to one row per
  // channel here and keep the split alongside.
  const byNetwork = new Map();
  for (const r of data || []) {
    const cur = byNetwork.get(r.network) || { network: r.network, clicks: 0, footer: 0, contact: 0, lastClick: null };
    cur.clicks += Number(r.clicks);
    cur[r.placement] = (cur[r.placement] || 0) + Number(r.clicks);
    if (!cur.lastClick || new Date(r.last_click) > new Date(cur.lastClick)) cur.lastClick = r.last_click;
    byNetwork.set(r.network, cur);
  }
  return { ok: true, unavailable: false, rows: [...byNetwork.values()].sort((a, b) => b.clicks - a.clicks) };
}
