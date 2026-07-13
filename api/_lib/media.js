import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";

// Server-side media resolution + signing for quiz images/audio.
//
// The physical object name on Storage is an HMAC of the question's logical
// coordinates (section / quiz / question / kind) keyed by MEDIA_SECRET. It is
// deterministic — so the same question always maps to the same file, keeping
// indexation exact — but unguessable without the secret, which never leaves the
// server. The client only ever sends coordinates; it never sees the name or the
// secret. Combined with short-lived signed URLs (and private buckets), this
// stops both URL enumeration and unauthenticated bulk download of the bank.
//
// The rename script (scripts/rename-media.mjs) uses the SAME derivation to move
// the existing convention-named files onto their opaque names; the two must
// stay in lockstep.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SECRET = process.env.MEDIA_SECRET || "";

const bucketFor = (kind) => (kind === "audio" ? "Audio" : "Image");
const extFor = (kind) => (kind === "audio" ? "mp3" : "webp");

// Opaque, unguessable object name for one media file. MUST match the identical
// function in scripts/rename-media.mjs, or signed URLs will point at files that
// don't exist.
export function mediaObjectName(section, quiz, order, kind) {
  const canonical = `${section}/${quiz}/${order}/${kind}`;
  const hash = crypto.createHmac("sha256", SECRET).update(canonical).digest("hex");
  return `${hash}.${extFor(kind)}`;
}

// Batch-signs media for a whole quiz in one shot (one Storage call per bucket),
// so the client can preload everything up front. Returns a map keyed by
// "<ref>:<kind>" -> signed URL; entries that fail to sign are simply omitted.
export async function signMediaBatch(items, expiresIn = 3600) {
  if (!SECRET) throw new HttpError(503, "Media signing is not configured (missing MEDIA_SECRET).");

  const byBucket = new Map(); // bucket -> [{ it, name }]
  for (const it of items) {
    const bucket = bucketFor(it.kind);
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push({ it, name: mediaObjectName(it.section, it.quiz, it.order, it.kind) });
  }

  const urls = {};
  for (const [bucket, entries] of byBucket) {
    const { data, error } = await admin.storage.from(bucket).createSignedUrls(entries.map((e) => e.name), expiresIn);
    if (error || !data) continue;
    data.forEach((row, i) => {
      if (row.signedUrl) urls[`${entries[i].it.ref}:${entries[i].it.kind}`] = row.signedUrl;
    });
  }
  return urls;
}
