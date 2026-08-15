// Runs the api/ serverless handlers on a plain Node server, so `npm run dev`
// has working API routes without `vercel dev`.
//
// Why this exists: `vite` alone serves no serverless functions, so every
// /api/* call 404s — the workshops, the dictée and the checkout all degrade,
// and aiService.js carries a special case just to explain the 404 to the user.
// `vercel dev` is the real thing, but it requires a Vercel login, which is a
// hard stop for anyone who just cloned the repo.
//
// This is a DEVELOPMENT convenience and deliberately not a Vercel emulator: it
// implements the small slice of the contract our handlers actually use. What
// runs in production is Vercel; anything subtle about routing, streaming or
// edge behaviour must still be verified there.
//
//   node scripts/dev-api.mjs        # or: npm run dev:api
//
// Vite proxies /api to it (see vite.config.js).

import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.DEV_API_PORT) || 3001;

/* ------------------------------ environment ------------------------------- */

// Vercel injects the project's environment; locally it lives in .env.local.
// Existing process.env wins, so `FOO=bar node scripts/dev-api.mjs` still works.
for (const file of [".env.local", ".env"]) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

/* ------------------------------- the handler ------------------------------ */

const API_DIR = path.join(ROOT, "api");

// /api/dictee -> api/dictee.js. Falling back to a dynamic segment,
// /api/admin/users -> api/admin/[resource].js with query.resource = "users",
// because the deployment collapses its small routes behind those to stay
// under Vercel's 12-function cap — without this, every admin and public route
// 404s locally while working fine in production.
//
// Anything with ".." in it is refused: this server reads from disk by request
// path, and a dev tool is still not a reason to expose the filesystem.
function resolveHandler(pathname) {
  const rel = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  if (!rel || rel.includes("..") || path.isAbsolute(rel)) return null;

  const inside = (full) => full.startsWith(API_DIR + path.sep) && existsSync(full);

  for (const candidate of [`${rel}.js`, path.join(rel, "index.js")]) {
    const full = path.join(API_DIR, candidate);
    if (inside(full)) return { file: full, params: {} };
  }

  // Dynamic segment: the last path piece becomes the [param] value.
  const segments = rel.split("/");
  const leaf = segments.pop();
  const dir = path.join(API_DIR, ...segments);
  if (!leaf || !existsSync(dir)) return null;
  const dynamic = readdirSync(dir).find((f) => /^\[[^\]]+\]\.js$/.test(f));
  if (!dynamic) return null;
  const full = path.join(dir, dynamic);
  return inside(full) ? { file: full, params: { [dynamic.slice(1, -4).replace("]", "")]: leaf } } : null;
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

// The subset of Vercel's response helpers our handlers call.
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    if (!res.headersSent) res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
    return res;
  };
  res.send = (body) => { res.end(typeof body === "string" ? body : JSON.stringify(body)); return res; };
  return res;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  decorate(res);

  if (!url.pathname.startsWith("/api/")) {
    return res.status(404).json({ error: "Only /api/* is served here — the app itself is on the Vite port." });
  }

  const match = resolveHandler(url.pathname);
  if (!match) return res.status(404).json({ error: `No handler for ${url.pathname}` });
  const { file, params } = match;

  // Route params and querystring share req.query, the way Vercel merges them.
  req.query = { ...Object.fromEntries(url.searchParams), ...params };
  const raw = await readBody(req);
  // Handlers read req.body as an already-parsed object, the way Vercel gives
  // it to them. A body that isn't JSON is passed through as the raw string
  // rather than throwing, matching how Vercel treats other content types.
  if (raw) {
    try { req.body = JSON.parse(raw); } catch { req.body = raw; }
  }

  const started = Date.now();
  try {
    // Cache-busted so editing THIS file takes effect without a restart. Its
    // imports are not: Node caches those by URL, so a change under api/_lib/
    // (where the real handlers live) still needs the server restarting. Worth
    // knowing before debugging a fix that appears not to have applied.
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
    await (mod.default || mod.handler)(req, res);
  } catch (err) {
    console.error(`  ✖ ${url.pathname}:`, err.stack || err.message);
    if (!res.writableEnded) res.status(500).json({ error: err.message || "Handler crashed" });
  }
  console.log(`  ${res.statusCode} ${req.method} ${url.pathname} · ${Date.now() - started} ms`);
});

server.listen(PORT, () => {
  const missing = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
  console.log(`dev API on http://localhost:${PORT} — serving api/*.js`);
  if (missing.length) console.log(`  ! missing env: ${missing.join(", ")} — auth-backed routes will fail`);
});
