// Look up what a bucket's opaque media name actually is (and vice versa).
//
// The names are an HMAC of the question's coordinates keyed by MEDIA_SECRET, so
// they can't be reversed mathematically — but they're deterministic, so with the
// secret we just recompute every possible name once and match against it. No
// stored manifest, no Supabase access needed — only MEDIA_SECRET.
//
// Usage (Node >= 20.6; loads .env.local for MEDIA_SECRET):
//
//   # opaque -> original (paste a hash you see while browsing the bucket)
//   node --env-file=.env.local scripts/media-name.mjs 3104947167dd69a8...319f.webp
//
//   # original -> opaque (coordinates; kind defaults by section: ce=image, co=audio)
//   node --env-file=.env.local scripts/media-name.mjs ce 10 1
//   node --env-file=.env.local scripts/media-name.mjs co 10 1 audio
//
//   # dump the whole table (redirect to a file if you like)
//   node --env-file=.env.local scripts/media-name.mjs --all
//
// Bounds are generous; bump MAX_QUIZ / MAX_Q if the bank ever outgrows them.

import crypto from "node:crypto";

const SECRET = process.env.MEDIA_SECRET;
if (!SECRET) { console.error("Missing MEDIA_SECRET (try: node --env-file=.env.local ...)."); process.exit(1); }

const MAX_QUIZ = 80;
const MAX_Q = 80;
// The only media that exists: Compréhension écrite images, Compréhension orale audio.
const KINDS = [
  { section: "ce", kind: "image", ext: "webp", prefix: "Comprehension_Ecrite" },
  { section: "co", kind: "audio", ext: "mp3", prefix: "Comprehension_Orale" },
];

const hashName = (section, quiz, order, kind, ext) =>
  `${crypto.createHmac("sha256", SECRET).update(`${section}/${quiz}/${order}/${kind}`).digest("hex")}.${ext}`;

const originalName = (prefix, quiz, order, ext) => `${prefix}_quiz_${quiz}_question_${order}.${ext}`;

// Build the forward table: opaque name -> human-readable original.
const byHash = new Map();
for (const { section, kind, ext, prefix } of KINDS) {
  for (let quiz = 1; quiz <= MAX_QUIZ; quiz++) {
    for (let order = 1; order <= MAX_Q; order++) {
      byHash.set(hashName(section, quiz, order, kind, ext), {
        section, kind, quiz, order, original: originalName(prefix, quiz, order, ext),
      });
    }
  }
}

const args = process.argv.slice(2);

if (args[0] === "--all") {
  for (const [hash, m] of byHash) console.log(`${hash}\t${m.original}\t(${m.section} quiz ${m.quiz} q ${m.order} ${m.kind})`);
  process.exit(0);
}

// opaque -> original: a single hash argument (with or without extension).
if (args.length === 1) {
  const key = args[0].includes(".") ? args[0] : null;
  const hit = key ? byHash.get(key) : [...byHash].find(([h]) => h.startsWith(args[0]))?.[1];
  const resolved = key ? byHash.get(key) : hit;
  if (!resolved) { console.error(`No match for "${args[0]}" (within quiz 1-${MAX_QUIZ}, question 1-${MAX_Q}).`); process.exit(1); }
  console.log(`${resolved.original}   (${resolved.section} · quiz ${resolved.quiz} · question ${resolved.order} · ${resolved.kind})`);
  process.exit(0);
}

// original -> opaque: <section> <quiz> <question> [kind]
if (args.length >= 3) {
  const section = args[0].toLowerCase();
  const quiz = Number(args[1]);
  const order = Number(args[2]);
  const kind = (args[3] || (section === "co" ? "audio" : "image")).toLowerCase();
  const def = KINDS.find((k) => k.section === section && k.kind === kind);
  if (!def) { console.error(`Unknown section/kind "${section}/${kind}". Use ce/image or co/audio.`); process.exit(1); }
  console.log(hashName(section, quiz, order, kind, def.ext));
  process.exit(0);
}

console.error("Usage: media-name.mjs <hash> | <section> <quiz> <question> [kind] | --all");
process.exit(1);
