// Guards the three hand-maintained SEO files against the drift that let the
// site ship pointing at a dead domain: index.html's social tags, robots.txt and
// sitemap.xml all lived separately from src/constants/seo.js, and nothing ever
// compared them.
//
//   npm run check:seo
//
// Checks, exiting non-zero on any failure:
//   1. every absolute URL in those files uses the canonical origin below;
//   2. every indexable route in seo.js appears in sitemap.xml;
//   3. sitemap.xml lists no path that seo.js does not serve, and none that is
//      marked noindex (a noindexed URL in a sitemap is a contradiction);
//   4. every internal link and image in the blog articles resolves.
//
// seo.js is read as text rather than imported: it uses Vite's "@/" alias, which
// plain node cannot resolve (same approach as scripts/count-content.mjs).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The canonical host. The apex tcfpasserelle.com answers 308 -> www, so www is
// what belongs in canonical URLs, sitemaps and share tags. Change it here and
// this script will tell you every file that still disagrees.
const ORIGIN = "https://www.tcfpasserelle.com";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const problems = [];
const fail = (msg) => problems.push(msg);

/* ── 1. every absolute URL points at the canonical origin ─────────────────── */
const FILES = ["index.html", "public/robots.txt", "public/sitemap.xml"];
for (const file of FILES) {
  const text = read(file);
  for (const [url] of text.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    // Ignore XML namespaces and other schema references — not site URLs.
    if (url.startsWith("http://www.sitemaps.org") || url.startsWith("http://www.w3.org") || url.startsWith("https://schema.org")) continue;
    if (!url.startsWith(ORIGIN)) fail(`${file}: ${url}\n    does not use the canonical origin ${ORIGIN}`);
  }
}

/* ── 2 & 3. sitemap paths vs the routes seo.js actually serves ────────────── */
const seo = read("src/constants/seo.js");

// Each ROUTE_META entry, captured by scanning brace depth from its opening line.
// A regex ending the entry at the next `^  },` silently mis-parses the file:
// one-line entries (`profile: { path: "/profil", ... },`) have no such closing
// line, so the previous multi-line entry swallows them AND the next real entry
// with them — which is how /conditions-generales came to "match no route".
const entries = [];
const seoLines = seo.split(/\r?\n/);
for (let i = 0; i < seoLines.length; i++) {
  const open = seoLines[i].match(/^ {2}"?([\w/-]+)"?:\s*\{/);
  if (!open) continue;
  let depth = 0;
  let body = "";
  for (let j = i; j < seoLines.length; j++) {
    const line = seoLines[j];
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    body += `${line}\n`;
    if (depth <= 0) { i = j; break; }
  }
  entries.push({ route: open[1], body });
}

const routes = [];
for (const { route, body } of entries) {
  const pathMatch = body.match(/path:\s*"([^"]*)"/);
  if (!pathMatch) continue; // pathless (the 404) — never in a sitemap
  routes.push({ route, path: pathMatch[1], noindex: /noindex:\s*true/.test(body) });
}
// Blog posts get their routes generated from POSTS, one file per article.
const POSTS_DIR = "src/constants/posts";
const postFiles = readdirSync(path.join(root, POSTS_DIR)).filter((f) => f.endsWith(".js"));
const posts = postFiles.map((file) => ({ file: `${POSTS_DIR}/${file}`, text: read(`${POSTS_DIR}/${file}`) }));
for (const { file, text } of posts) {
  const slug = (text.match(/slug:\s*"([^"]+)"/) || [])[1];
  if (!slug) { fail(`${file}: no slug`); continue; }
  routes.push({ route: `blog/${slug}`, path: `/blogue/${slug}`, noindex: false });
}
if (routes.length < 10) fail(`src/constants/seo.js: parsed only ${routes.length} routes — the parser needs updating`);

const sitemap = read("public/sitemap.xml");
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => u.replace(ORIGIN, "") || "/"));

// `noindex: TERMS_DRAFT` and friends are computed, not literal — treat any
// non-literal noindex as "unknown" and skip it rather than guess wrong.
const computedNoindex = new Set(
  entries.filter(({ body }) => /noindex:\s*(?!true|false)/.test(body)).map(({ route }) => route),
);

for (const r of routes) {
  const expected = r.path === "/" ? "/" : r.path;
  if (computedNoindex.has(r.route)) continue;
  if (!r.noindex && !listed.has(expected)) fail(`public/sitemap.xml: missing indexable route "${r.route}" (${ORIGIN}${r.path})`);
  if (r.noindex && listed.has(expected)) fail(`public/sitemap.xml: lists "${r.route}" (${r.path}) which is marked noindex`);
}

const known = new Set(routes.map((r) => (r.path === "/" ? "/" : r.path)));
for (const p of listed) {
  if (!known.has(p)) fail(`public/sitemap.xml: lists ${p}, which matches no route in src/constants/seo.js`);
}

/* ── 4. article links and images actually resolve ─────────────────────────── */
// The articles interlink heavily ([libellé](/chemin) in src/constants/posts).
// A typo there renders as plain text in the app rather than as a link — silent,
// and exactly the kind of rot that makes an internal-linking effort decay. Same
// for a hero/figure pointing at an image that was never committed.
const servedPaths = new Set(routes.map((r) => r.path));
for (const { file, text } of posts) {
  for (const [, label, href] of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    if (/^https?:/i.test(href)) continue; // outbound links are not ours to verify
    if (!href.startsWith("/")) fail(`${file}: link "${label}" -> "${href}" is neither absolute-internal nor http(s)`);
    else if (!servedPaths.has(href)) fail(`${file}: link "${label}" -> "${href}" matches no route`);
  }
  for (const [, src] of text.matchAll(/src:\s*"(\/[^"]+)"/g)) {
    if (!existsSync(path.join(root, "public", src))) fail(`${file}: image "${src}" is missing from public/`);
  }
}

/* ── report ───────────────────────────────────────────────────────────────── */
console.log(`Canonical origin: ${ORIGIN}`);
console.log(`Routes with a path: ${routes.length} · URLs in sitemap: ${listed.size}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("ok — social tags, robots.txt and sitemap.xml all agree with seo.js.");
