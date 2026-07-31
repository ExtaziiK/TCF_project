// Gives every route its own HTML at build time.
//
// The app is a client-rendered SPA: one index.html for every URL, with the
// per-page title/description written by applyRouteMeta() once React has
// booted. That leaves two real problems, both invisible in a browser:
//
//   · every indexable URL shipped IDENTICAL <title> and <meta description>, so
//     to anything reading the response rather than rendering it — Google's
//     first pass included — the site looked like one page repeated 20 times.
//   · social scrapers (WhatsApp, Facebook, LinkedIn, Slack) never run JS at
//     all, so every shared link previewed with the homepage's card no matter
//     which page was shared.
//
// This writes dist/<path>/index.html for each route, with that route's tags
// baked in. Vercel serves a matching static file before it consults the
// rewrite in vercel.json, so /tarifs gets dist/tarifs/index.html and only
// unknown paths fall through to the SPA shell.
//
// Metadata only, deliberately: no page CONTENT is prerendered. Injecting
// markup into #root would be wiped by createRoot on mount, and the flash is a
// worse trade than it looks. Google renders JS for content; what it does not
// do reliably is treat 20 identically-titled URLs as 20 pages.
//
// Runs from `npm run build`, after vite build.

import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

// ROUTE_META lives in src/constants/seo.js, which imports through the "@"
// alias and so can't be imported by Node directly. Bundle it to a temp ESM
// file first — one source of truth rather than a copy that drifts.
async function loadRouteMeta() {
  const outfile = path.join(dist, ".seo-meta.mjs");
  await build({
    entryPoints: [path.join(root, "src/constants/seo.js")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    alias: { "@": path.join(root, "src") },
  });
  const mod = await import(`file://${outfile}?t=${Date.now()}`);
  await fs.rm(outfile, { force: true });
  return mod;
}

const escapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replaces a tag if present, appends before </head> otherwise. The shell
// writes some of these across several lines, hence [\s\S] rather than .
function setTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function pageHtml(shell, { title, description, url, noindex }) {
  let html = shell;
  const t = escapeAttr(title);
  const d = escapeAttr(description);

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = setTag(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${d}" />`);
  html = setTag(html, /<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${t}" />`);
  html = setTag(html, /<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${d}" />`);
  html = setTag(html, /<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta\s+name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${t}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${d}" />`);
  // Neither of these exists in the shell — applyRouteMeta creates them at
  // runtime — so both are appended on the first pass.
  html = setTag(html, /<meta\s+name="robots"[\s\S]*?\/>/, `<meta name="robots" content="${noindex ? "noindex" : "index, follow"}" />`);
  html = setTag(html, /<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`);
  return html;
}

const shell = await fs.readFile(path.join(dist, "index.html"), "utf8");

// The canonical host, taken from the shell's own og:url rather than repeated
// here, so this can never disagree with index.html — which `npm run check:seo`
// already keeps aligned with robots.txt and sitemap.xml.
const origin = (shell.match(/<meta\s+property="og:url"\s+content="(https?:\/\/[^/"]+)/) || [])[1];
if (!origin) {
  console.error("prerender: no og:url in dist/index.html — cannot determine the canonical host.");
  process.exit(1);
}

const { ROUTE_META, SITE_NAME } = await loadRouteMeta();

let written = 0;
let indexable = 0;
for (const [route, meta] of Object.entries(ROUTE_META)) {
  if (!meta.path) continue; // the 404 has no address of its own
  // Same rule as applyRouteMeta: the homepage keeps its brand-first title,
  // every other page appends the brand.
  const title = route === "home" ? meta.title : `${meta.title} · ${SITE_NAME}`;
  const description = meta.description || ROUTE_META.home.description;
  const url = origin + meta.path;
  const html = pageHtml(shell, { title, description, url, noindex: !!meta.noindex });

  const target = meta.path === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, meta.path, "index.html");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, "utf8");
  written++;
  if (!meta.noindex) indexable++;
}

console.log(`prerender: ${written} pages (${indexable} indexable) at ${origin}`);
