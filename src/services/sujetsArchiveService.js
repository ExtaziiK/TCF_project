import { supabase } from "@/services/supabaseClient";

// Monthly subjects archive (Expression écrite / orale). Admin-managed via the
// sujets_archive table (RLS: public read, admin write — see migration
// 20260728_sujets_archive.sql), with the shipped /data/*.json used as a seed
// and as a read-time fallback when the table is empty or the migration hasn't
// been applied yet. One row per (section, year, month); `data` is that month's
// payload: combinaisons for EE, tâches→parties→sujets for EO.

export const MONTH_LABELS = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const monthLabel = (n) => MONTH_LABELS[n] || `Mois ${n}`;
export const monthKey = (year, monthNum) => `${year}-${String(monthNum).padStart(2, "0")}`;
export const SECTION_LABEL = { ee: "Expression écrite", eo: "Expression orale" };

// Groups a flat list of { year, monthNum, data } into the year→month tree the
// pages render, newest first.
function toYears(rows) {
  const byYear = new Map();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push({ key: monthKey(r.year, r.monthNum), month: monthLabel(r.monthNum), monthNum: r.monthNum, data: r.data || [] });
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({ year, months: months.sort((a, b) => b.monthNum - a.monthNum) }));
}

// Shipped fallback: /data/sujets-<section>.json ships EE months with `sujets`
// and EO months with `taches`; normalize both to a `data` array.
export async function fetchShipped(section) {
  try {
    const res = await fetch(`/data/sujets-${section}.json`, { cache: "no-cache" });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = [];
    for (const y of json.years || []) {
      for (const m of y.months || []) rows.push({ year: y.year, monthNum: m.monthNum, data: m.sujets || m.taches || [] });
    }
    return rows;
  } catch {
    return [];
  }
}

// Reads the whole archive for a section. The shipped JSON is always the base
// (every imported subject is kept, no seeding step); rows in the DB are admin
// additions/edits that override the same month on top of that base. So a fresh
// database shows the full built-in set, and admin changes layer over it.
export async function loadArchive(section) {
  const map = new Map();
  for (const r of await fetchShipped(section)) map.set(`${r.year}-${r.monthNum}`, r);
  const { data, error } = await supabase.from("sujets_archive").select("year, month_num, data").eq("section", section);
  if (!error && data) {
    for (const r of data) map.set(`${r.year}-${r.month_num}`, { year: r.year, monthNum: r.month_num, data: r.data });
  }
  return { years: toYears([...map.values()]) };
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// Admin-only (RLS). Creates or replaces one month's payload.
export async function saveMonth(section, year, monthNum, data) {
  const { error } = await supabase.from("sujets_archive").upsert(
    { section, year, month_num: monthNum, data, updated_at: new Date().toISOString(), updated_by: await currentUserId() },
    { onConflict: "section,year,month_num" },
  );
  return { ok: !error, error: error?.message };
}

// Admin-only (RLS). Removes a month's admin override. If the month also exists
// in the shipped base, it reverts to that base on the next load.
export async function deleteMonth(section, year, monthNum) {
  const { error } = await supabase.from("sujets_archive").delete().eq("section", section).eq("year", year).eq("month_num", monthNum);
  return { ok: !error, error: error?.message };
}
