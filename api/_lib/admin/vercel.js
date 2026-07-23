import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Vercel Web Analytics for the admin "Trafic" tab. Vercel's public Web
// Analytics API (api.vercel.com/v1/query/web-analytics/*) reads the same
// aggregated model as the Vercel dashboard, so the visitors / page views shown
// here match what the project owner sees on vercel.com. Read-only, and
// server-side because it needs a Vercel access token that must never reach the
// browser.
//
// Setup (the tab explains this itself when unconfigured):
//   1. Enable Web Analytics on the project (Vercel dashboard → Analytics).
//   2. VERCEL_ANALYTICS_TOKEN : a Vercel access token — vercel.com/account/tokens.
//   3. VERCEL_PROJECT_ID      : the project id (prj_…), in Project → Settings.
//   4. VERCEL_TEAM_ID         : the owning team id (team_…) — only if the project
//                               belongs to a team; omit for a personal account.
// A missing token/project degrades to { configured: false }, never a 500.

const API = "https://api.vercel.com/v1/query/web-analytics";
const DAY = 24 * 3600 * 1000;
const DAYS_SHOWN = 14; // matches the overview DayBars density
const WINDOW_DAYS = 30; // Hobby reporting window; Pro/Enterprise keep more
const TOP_LIMIT = "6";

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function creds() {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID || null;
  return token && projectId ? { token, projectId, teamId } : null;
}

// One GET against a Web Analytics endpoint. `params` are merged with the shared
// project/team scope and URL-encoded. A non-2xx throws so the handler surfaces
// Vercel's own message (bad token, analytics disabled…) instead of a blank 500.
async function query(path, { token, projectId, teamId }, params = {}) {
  const qs = new URLSearchParams({ projectId, ...(teamId ? { teamId } : {}), ...params });
  const res = await fetch(`${API}/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(502, `Vercel Analytics (${res.status}) : ${detail.slice(0, 200)}`);
  }
  return res.json();
}

// A continuous DAYS_SHOWN-day page-views/visitors series (oldest first), with
// gaps filled to zero — Vercel omits days that had no traffic.
function fillSeries(rows) {
  const series = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    series.push({ date: dayKey(new Date(Date.now() - i * DAY)), count: 0, visitors: 0 });
  }
  const index = Object.fromEntries(series.map((d, i) => [d.date, i]));
  for (const r of rows) {
    const i = index[dayKey(r.timestamp)];
    if (i !== undefined) { series[i].count = r.pageviews || 0; series[i].visitors = r.visitors || 0; }
  }
  return series;
}

// A grouped-dimension response → ranked rows the tab renders directly. `key` is
// the dimension field name Vercel echoes back (route, country, …). Unlabeled
// rows (e.g. direct traffic has no referrer) keep a null label for the UI.
function rank(resp, key) {
  return (resp.data || []).map((r) => ({
    label: r[key] || null,
    pageviews: r.pageviews || 0,
    visitors: r.visitors || 0,
  }));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await requireAdmin(req);

    const c = creds();
    if (!c) return res.status(200).json({ configured: false });

    const since = dayKey(new Date(Date.now() - WINDOW_DAYS * DAY));
    const until = dayKey(new Date());
    const range = { since, until };
    const top = (by) => query("visits/aggregate", c, { ...range, by, limit: TOP_LIMIT });

    const [daily, routes, referrers, countries, devices, lifetime] = await Promise.all([
      query("visits/aggregate", c, { ...range, by: "day" }),
      top("route"),
      top("referrerHostname"),
      top("country"),
      top("deviceType"),
      query("visits/count", c).catch(() => null), // lifetime totals; optional
    ]);

    const rows = daily.data || [];
    // Daily visitors summed across days over-counts a returning visitor once per
    // day — an accepted approximation for a range total; the link-out shows the
    // exact unique figure. Page views sum exactly.
    const since7 = Date.now() - 7 * DAY;
    const sumFrom = (ms, k) => rows.filter((r) => Date.parse(r.timestamp) >= ms).reduce((s, r) => s + (r[k] || 0), 0);

    res.status(200).json({
      configured: true,
      window: { since, until, days: WINDOW_DAYS },
      totals: {
        pageviews30d: sumFrom(0, "pageviews"),
        visitors30d: sumFrom(0, "visitors"),
        pageviews7d: sumFrom(since7, "pageviews"),
        visitors7d: sumFrom(since7, "visitors"),
        lifetimePageviews: lifetime?.data?.pageviews ?? null,
        lifetimeVisitors: lifetime?.data?.visitors ?? null,
      },
      byDay: fillSeries(rows),
      topPages: rank(routes, "route"),
      topReferrers: rank(referrers, "referrerHostname"),
      topCountries: rank(countries, "country"),
      devices: rank(devices, "deviceType"),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Vercel analytics request failed." });
  }
}
