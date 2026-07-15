// One-off migration: rename the convention-named media objects on Supabase
// Storage (Comprehension_Orale_quiz_1_question_24.mp3, …) to their opaque,
// unguessable HMAC names, so the file names stop leaking the bank's structure
// and can't be enumerated.
//
// Deterministic: the same logical question always maps to the same opaque name,
// keeping indexation exact. The hash MUST match api/_lib/media.js's
// mediaObjectName exactly, or the app's signed URLs will point at files that no
// longer exist. Idempotent: files already renamed (64-hex names) are skipped,
// so it's safe to re-run.
//
// Run it AFTER deploying the signing code but BEFORE enabling VITE_SIGNED_MEDIA,
// with the same MEDIA_SECRET the server uses. Easiest is to load .env.local
// (Node >= 20.6; cross-shell, so it works in PowerShell too) — it must contain
// VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and MEDIA_SECRET:
//
//   node --env-file=.env.local scripts/rename-media.mjs           # dry run (prints planned moves)
//   node --env-file=.env.local scripts/rename-media.mjs --apply   # actually move the files
//
// (Or export the three vars in your shell first and drop --env-file.)
//
// Recommended rollout order:
//   1. Set MEDIA_SECRET (server) and deploy the signing code (flag still off).
//   2. Dry-run this script, eyeball the plan, then --apply.
//   3. Set VITE_SIGNED_MEDIA=true and redeploy; verify a quiz loads media.
//   4. Flip the Audio/Image buckets to private in the Supabase dashboard.

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET } = process.env;
const APPLY = process.argv.includes("--apply");

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MEDIA_SECRET) {
  console.error("Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET are all required.");
  process.exit(1);
}

const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BUCKETS = ["Audio", "Image"];
const SECTION_FROM_PREFIX = { orale: "co", ecrite: "ce", écrite: "ce" };
const ALREADY_HASHED = /^[0-9a-f]{64}\.(mp3|webp)$/i;
// Comprehension_Orale_quiz_1_question_24.mp3  /  Comprehension_Ecrite_quiz_37_question_32.webp
const CONVENTION = /^comprehension_(orale|ecrite|écrite)_quiz_(\d+)_question_(\d+)\.(mp3|webp)$/i;

// MUST stay identical to api/_lib/media.js#mediaObjectName.
function mediaObjectName(section, quiz, order, kind) {
  const canonical = `${section}/${quiz}/${order}/${kind}`;
  const ext = kind === "audio" ? "mp3" : "webp";
  return `${crypto.createHmac("sha256", MEDIA_SECRET).update(canonical).digest("hex")}.${ext}`;
}

// Pages through every object in a bucket (list caps at 100 by default).
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

async function run() {
  let planned = 0, moved = 0, skipped = 0, unmatched = 0;
  for (const bucket of BUCKETS) {
    const names = await listAll(bucket);
    for (const name of names) {
      if (ALREADY_HASHED.test(name)) { skipped++; continue; }
      const m = CONVENTION.exec(name);
      if (!m) { unmatched++; console.warn(`  ? unmatched: ${bucket}/${name}`); continue; }
      const section = SECTION_FROM_PREFIX[m[1].toLowerCase()];
      const quiz = Number(m[2]);
      const order = Number(m[3]);
      const kind = m[4].toLowerCase() === "mp3" ? "audio" : "image";
      const target = mediaObjectName(section, quiz, order, kind);
      planned++;
      if (!APPLY) { console.log(`  plan: ${bucket}/${name} -> ${target}`); continue; }
      const { error } = await admin.storage.from(bucket).move(name, target);
      if (error) { console.error(`  FAIL ${bucket}/${name}: ${error.message}`); continue; }
      moved++;
    }
  }
  console.log(`\n${APPLY ? "Applied" : "Dry run"}: ${APPLY ? moved : planned} file(s) ${APPLY ? "moved" : "to move"}, ${skipped} already-hashed, ${unmatched} unmatched.`);
  if (!APPLY) console.log("Re-run with --apply to perform the moves.");
}

run().catch((e) => { console.error(e); process.exit(1); });
