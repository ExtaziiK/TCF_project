// Dumps a local CSV of every media object currently in the Supabase Audio/Image
// buckets, mapping each one's current (opaque) name back to its original
// convention name. Reflects the real bucket contents — including the ` (1)`
// duplicates that were never renamed — not just a computed table.
//
// The opaque names are a one-way HMAC, so they can't be reversed directly; we
// recompute every possible name from MEDIA_SECRET and match. Needs Supabase
// access (to list the bucket) plus the secret.
//
// Usage (Node >= 20.6):
//   node --env-file=.env.local scripts/media-inventory.mjs               # -> media-inventory.csv
//   node --env-file=.env.local scripts/media-inventory.mjs out.csv       # custom path
//
// The output maps hashes back to questions — keep it local, don't commit/share.

import crypto from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET } = process.env;
if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MEDIA_SECRET) {
  console.error("Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET all required.");
  process.exit(1);
}
const OUT = process.argv[2] || "media-inventory.csv";

const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const KINDS = [
  { bucket: "Image", section: "ce", kind: "image", ext: "webp", prefix: "Comprehension_Ecrite" },
  { bucket: "Audio", section: "co", kind: "audio", ext: "mp3", prefix: "Comprehension_Orale" },
];
const MAX_QUIZ = 80, MAX_Q = 80;

const hashName = (section, quiz, order, kind, ext) =>
  `${crypto.createHmac("sha256", MEDIA_SECRET).update(`${section}/${quiz}/${order}/${kind}`).digest("hex")}.${ext}`;

// Precompute opaque -> original for every plausible coordinate, per bucket.
const tableByBucket = {};
for (const { bucket, section, kind, ext, prefix } of KINDS) {
  const map = new Map();
  for (let quiz = 1; quiz <= MAX_QUIZ; quiz++)
    for (let order = 1; order <= MAX_Q; order++)
      map.set(hashName(section, quiz, order, kind, ext), {
        section, kind, quiz, order, original: `${prefix}_quiz_${quiz}_question_${order}.${ext}`,
      });
  tableByBucket[bucket] = map;
}

const CONVENTION = /^comprehension_(orale|ecrite|écrite)_quiz_(\d+)_question_(\d+)/i;
const SECTION_FROM_PREFIX = { orale: "co", ecrite: "ce", écrite: "ce" };

async function listAll(bucket) {
  const names = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list("", { limit: 100, offset });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    if (!data.length) break;
    names.push(...data.map((o) => o.name));
    if (data.length < 100) break;
  }
  return names;
}

const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function run() {
  const rows = [["bucket", "current_name", "original_name", "section", "quiz", "question", "kind", "status"]];
  const counts = { renamed: 0, unrenamed_duplicate: 0, unmatched: 0 };

  for (const { bucket } of KINDS) {
    const table = tableByBucket[bucket];
    for (const name of await listAll(bucket)) {
      const opaque = table.get(name);
      if (opaque) {
        rows.push([bucket, name, opaque.original, opaque.section, opaque.quiz, opaque.question ?? opaque.order, opaque.kind, "renamed"]);
        counts.renamed++;
        continue;
      }
      const m = CONVENTION.exec(name);
      if (m) {
        // Still convention-named (e.g. the ` (1)` duplicates) — original = itself.
        rows.push([bucket, name, name, SECTION_FROM_PREFIX[m[1].toLowerCase()], Number(m[2]), Number(m[3]), bucket === "Audio" ? "audio" : "image", "unrenamed_duplicate"]);
        counts.unrenamed_duplicate++;
        continue;
      }
      rows.push([bucket, name, "", "", "", "", "", "unmatched"]);
      counts.unmatched++;
    }
  }

  writeFileSync(OUT, rows.map((r) => r.map(csv).join(",")).join("\n") + "\n", "utf8");
  console.log(`Wrote ${OUT}: ${rows.length - 1} files (${counts.renamed} renamed, ${counts.unrenamed_duplicate} unrenamed duplicates, ${counts.unmatched} unmatched).`);
}

run().catch((e) => { console.error(e); process.exit(1); });
