// Copies the landing CE demo's documents (src/constants/demoPool.js) out of the
// private Image bucket into src/assets/demo/ce1/, so the home page shows them
// as plain static files — no quiz chunk, no /api/media signing round trip
// before the image can even start downloading. Quiz 1 is the public teaser
// (api/media.js signs it for anonymous visitors), so nothing new is exposed.
//
// Re-run after changing the pool or replacing one of these images:
//   node --env-file=.env.local scripts/fetch-demo-media.mjs
// The committed files were then re-encoded at WebP quality 70 (method 6),
// ~40% lighter with the text still crisp, e.g. with Pillow:
//   im.save(path, "WEBP", quality=70, method=6)

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { CE_DEMO_QUIZ, CE_DEMO_ORDERS } from "../src/constants/demoPool.js";

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET } = process.env;
if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MEDIA_SECRET) {
  console.error("Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SECRET all required.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "src/assets/demo/ce1");
fs.mkdirSync(outDir, { recursive: true });

const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// Same name as api/_lib/media.js#mediaObjectName.
const objectName = (order) =>
  `${crypto.createHmac("sha256", MEDIA_SECRET).update(`ce/${CE_DEMO_QUIZ}/${order}/image`).digest("hex")}.webp`;

let failed = 0;
for (const order of CE_DEMO_ORDERS) {
  const { data, error } = await admin.storage.from("Image").download(objectName(order));
  if (error) { console.error(`q${order}: ${error.message}`); failed++; continue; }
  const buf = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `q${order}.webp`), buf);
  console.log(`q${order}.webp  ${(buf.length / 1024).toFixed(0)} KB`);
}
process.exit(failed ? 1 : 0);
