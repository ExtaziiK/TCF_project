import { supabase } from "@/services/supabaseClient";
import { todayKey } from "@/utils/conjugationQuota";

// Storage for the daily conjugation-practice budget of a free account. The
// rules themselves (the limit, the warning threshold, the day boundary) live
// in @/utils/conjugationQuota, which has no I/O and is unit-tested.
//
// Supabase first, localStorage when the table is missing (error 42P01) or no
// user id is available — the same resilience pattern as quizResultsService and
// dicteeService, and it matters more here than there: this migration may not
// be applied yet, and a quota that throws would take the whole practice column
// down with it. A quota that cannot be read falls back to the local number;
// a quota that cannot be written keeps counting locally for the session.

const LOCAL_KEY = (userId) => `passerelle.conj.usage.${userId || "anon"}`;

const isMissingTable = (error) =>
  error && (error.code === "42P01" || /conjugation_usage/.test(error.message || ""));

const localStore = {
  read(userId, day) {
    try {
      const row = JSON.parse(localStorage.getItem(LOCAL_KEY(userId)));
      return row && row.day === day ? Math.max(0, row.seconds | 0) : 0;
    } catch { return 0; }
  },
  write(userId, day, seconds) {
    try { localStorage.setItem(LOCAL_KEY(userId), JSON.stringify({ day, seconds })); } catch { /* storage blocked */ }
  },
};

// Seconds already spent today. Always resolves — a failure reads as "whatever
// this device remembers", never as an exception the caller has to handle.
export async function readUsage(userId) {
  const day = todayKey();
  const local = localStore.read(userId, day);
  if (!userId) return { seconds: local, backend: "local" };

  const { data, error } = await supabase
    .from("conjugation_usage")
    .select("seconds")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();

  if (error) {
    if (!isMissingTable(error)) console.warn("conjugation_usage:", error.message);
    return { seconds: local, backend: "local" };
  }
  // The larger of the two wins. The stored total is normally ahead, but a
  // flush that failed on the way out lives only on this device, and losing it
  // would silently hand back the minutes it recorded.
  const seconds = Math.max(data?.seconds ?? 0, local);
  return { seconds, backend: "supabase" };
}

// Writes the running total. `seconds` is absolute, not a delta, so a flush
// that never lands costs nothing — the next one carries the same ground.
export async function writeUsage(userId, seconds) {
  const day = todayKey();
  const total = Math.max(0, Math.round(seconds));
  localStore.write(userId, day, total);
  if (!userId) return;

  const { error } = await supabase
    .from("conjugation_usage")
    .upsert({ user_id: userId, day, seconds: total, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });

  if (error && !isMissingTable(error)) console.warn("conjugation_usage write:", error.message);
}
