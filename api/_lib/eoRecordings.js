// The Expression orale recordings of an account (bucket "eo-recordings",
// supabase/migrations/20261023_eo_recordings.sql). Their table rows go with the
// account (on delete cascade); the files themselves don't, so every place that
// deletes an account calls this first — a voice must not outlive its account.

export const EO_RECORDINGS_BUCKET = "eo-recordings";

// Removes every file in the account's folder. Never throws: a storage hiccup
// (or the bucket not existing yet) must not block the account deletion
// itself; it is logged instead. Returns how many files were removed.
export async function removeUserRecordings(admin, userId) {
  if (!userId) return 0;
  let removed = 0;
  try {
    const bucket = admin.storage.from(EO_RECORDINGS_BUCKET);
    for (let round = 0; round < 50; round++) {
      const { data, error } = await bucket.list(userId, { limit: 1000 });
      if (error) throw error;
      if (!data?.length) break;
      const { error: rmError } = await bucket.remove(data.map((f) => `${userId}/${f.name}`));
      if (rmError) throw rmError;
      removed += data.length;
      if (data.length < 1000) break;
    }
  } catch (err) {
    console.warn(`eo-recordings: files of ${userId} not removed:`, err?.message || err);
  }
  return removed;
}
