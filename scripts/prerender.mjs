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
// baked in, so /tarifs gets dist/tarifs/index.html. Unknown paths get
// dist/404.html with a 404 status; only the dynamic model-answer route is
// rewritten to the SPA shell (vercel.json).
//
// Metadata only, deliberately: no page CONTENT is prerendered. Injecting
// markup into #root would be wiped by createRoot on mount, and the flash is a
// worse trade than it looks. Google renders JS for content; what it does not
// do reliably is treat 20 identically-titled URLs as 20 pages.
//
// Each page also gets, statically:
//   · its JSON-LD (Organization/WebSite on the home page, BlogPosting and a
//     breadcrumb on articles, a breadcrumb on guide chapters) — from the same
//     builders the app uses at runtime (seo.js), under the same element ids;
//   · a <noscript> with the page's own title, description and links to the
//     public pages, for crawlers that do not run JavaScript;
// and the build writes dist/sitemap.xml from the same table: every indexable
// route, articles dated by their publication day.
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

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// JSON inside <script>: "</" must not appear, or it could close the tag.
const jsonLd = (id, data) => `<script type="application/ld+json" id="${id}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

function pageHtml(shell, { title, description, url, noindex, image, jsonLds, noscript }) {
  let html = shell;
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const img = escapeAttr(image.url);

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = setTag(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${d}" />`);
  html = setTag(html, /<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${t}" />`);
  html = setTag(html, /<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${d}" />`);
  html = setTag(html, /<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta\s+name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${t}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${d}" />`);
  // Articles carry their own share card; every other route keeps the shell's.
  html = setTag(html, /<meta\s+property="og:image"\s[\s\S]*?\/>/, `<meta property="og:image" content="${img}" />`);
  html = setTag(html, /<meta\s+property="og:image:width"[\s\S]*?\/>/, `<meta property="og:image:width" content="${image.w}" />`);
  html = setTag(html, /<meta\s+property="og:image:height"[\s\S]*?\/>/, `<meta property="og:image:height" content="${image.h}" />`);
  html = setTag(html, /<meta\s+property="og:image:alt"[\s\S]*?\/>/, `<meta property="og:image:alt" content="${escapeAttr(image.alt)}" />`);
  html = setTag(html, /<meta\s+name="twitter:image"\s[\s\S]*?\/>/, `<meta name="twitter:image" content="${img}" />`);
  html = setTag(html, /<meta\s+name="twitter:image:alt"[\s\S]*?\/>/, `<meta name="twitter:image:alt" content="${escapeAttr(image.alt)}" />`);
  // Neither of these exists in the shell — applyRouteMeta creates them at
  // runtime — so both are appended on the first pass.
  html = setTag(html, /<meta\s+name="robots"[\s\S]*?\/>/, `<meta name="robots" content="${noindex ? "noindex" : "index, follow"}" />`);
  html = setTag(html, /<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`);
  for (const { id, data } of jsonLds) html = html.replace("</head>", `    ${jsonLd(id, data)}\n  </head>`);
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${noscript}</noscript>`);
  return html;
}

// What a crawler without JavaScript reads: the page's own heading and
// description, then the public pages to follow.
function noscriptFor({ title, description }, links) {
  const nav = links.map(({ href, label }) => `<li><a href="${escapeAttr(href)}">${escapeHtml(label)}</a></li>`).join("");
  return `
      <div style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <p>Activez JavaScript pour utiliser l'application.</p>
        <ul>${nav}</ul>
      </div>
    `;
}

const shell = await fs.readFile(path.join(dist, "index.html"), "utf8");

// Every page but Home is a lazy chunk (src/pages/index.jsx). Left alone, the
// browser learns it needs /tarifs's chunk only once the entry script has
// downloaded and run, then fetches it: two round trips in series before the
// page can draw. A <link rel="modulepreload"> per route lets it fetch the page
// chunk, and the chunks it imports, alongside the entry script instead.
//
// The route → chunk table is read from the source rather than repeated here:
// the lazyPage() declarations give each component's module, PAGES gives each
// route's component, and Vite's manifest gives each module's built files.
async function loadPagePreloads() {
  const manifestPath = path.join(dist, ".vite", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  await fs.rm(path.join(dist, ".vite"), { recursive: true, force: true }); // build-time only
  const source = await fs.readFile(path.join(root, "src/pages/index.jsx"), "utf8");

  const moduleOf = {};
  for (const [, name, spec] of source.matchAll(/const (\w+) = lazyPage\(\(\) => import\("@\/([^"]+)"\)/g)) {
    const key = ["jsx", "js"].map((ext) => `src/${spec}.${ext}`).find((k) => manifest[k]);
    if (key) moduleOf[name] = key;
  }
  const pagesBlock = source.slice(source.indexOf("export const PAGES"));
  const files = (key, seen = new Set()) => {
    const entry = manifest[key];
    if (!entry || entry.isEntry || seen.has(key)) return [];
    seen.add(key);
    return [entry.file, ...(entry.imports || []).flatMap((k) => files(k, seen))];
  };
  const preloads = {};
  for (const [, route, name] of pagesBlock.matchAll(/^\s*"?([\w-]+)"?: (\w+),/gm)) {
    if (moduleOf[name]) preloads[route] = [...new Set(files(moduleOf[name]))];
  }
  return preloads;
}
const PAGE_PRELOADS = await loadPagePreloads();
const preloadTags = (route) =>
  (PAGE_PRELOADS[route] || PAGE_PRELOADS[route.split("/")[0]] || [])
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`);

// The canonical host, taken from the shell's own og:url rather than repeated
// here, so this can never disagree with index.html — which `npm run check:seo`
// already keeps aligned with robots.txt and sitemap.xml.
const origin = (shell.match(/<meta\s+property="og:url"\s+content="(https?:\/\/[^/"]+)/) || [])[1];
if (!origin) {
  console.error("prerender: no og:url in dist/index.html — cannot determine the canonical host.");
  process.exit(1);
}

const { ROUTE_META, SITE_NAME, DEFAULT_SHARE_IMAGE, routeJsonLd, siteJsonLd, ROUTE_JSONLD_ID, SITE_JSONLD_ID } = await loadRouteMeta();

// The main public pages, for every page's <noscript>.
const NOSCRIPT_LINKS = ["home", "guide", "calculator", "sujets-ee", "sujets-eo", "blog", "pricing", "faq"]
  .filter((r) => ROUTE_META[r]?.path)
  .map((r) => ({ href: ROUTE_META[r].path, label: r === "home" ? "Accueil" : ROUTE_META[r].title }));

let written = 0;
let indexable = 0;
const sitemap = [];
for (const [route, meta] of Object.entries(ROUTE_META)) {
  if (!meta.path) continue; // the 404 has no address of its own
  // Same rule as applyRouteMeta: the homepage keeps its brand-first title,
  // every other page appends the brand.
  const title = route === "home" ? meta.title : `${meta.title} · ${SITE_NAME}`;
  const description = meta.description || ROUTE_META.home.description;
  const url = origin + meta.path;
  const img = meta.image || DEFAULT_SHARE_IMAGE;
  const image = { url: origin + img.src, w: img.w, h: img.h, alt: img.alt || title };
  const jsonLds = [];
  if (route === "home") jsonLds.push({ id: SITE_JSONLD_ID, data: siteJsonLd(origin) });
  const routeData = routeJsonLd(route, origin);
  if (routeData) jsonLds.push({ id: ROUTE_JSONLD_ID, data: routeData });
  const noscript = noscriptFor({ title: meta.title, description }, NOSCRIPT_LINKS);
  let html = pageHtml(shell, { title, description, url, image, noindex: !!meta.noindex, jsonLds, noscript });
  for (const tag of preloadTags(route)) html = html.replace("</head>", `    ${tag}\n  </head>`);
  if (!meta.noindex) sitemap.push({ loc: url, lastmod: meta.post?.iso });

  const target = meta.path === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, meta.path, "index.html");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, "utf8");
  written++;
  if (!meta.noindex) indexable++;
}

// The error page. Every route above has its own HTML now, so vercel.json no
// longer rewrites unknown paths to the shell: they get this file with a real
// 404 status (Vercel serves dist/404.html for anything unmatched) instead of a
// 200 "soft 404" that search engines have to second-guess. No canonical or
// og:url — an error page has no address of its own.
{
  const meta = ROUTE_META.notfound;
  const title = `${meta.title} · ${SITE_NAME}`;
  const img = DEFAULT_SHARE_IMAGE;
  let html = pageHtml(shell, {
    title, description: meta.description, url: origin + "/", noindex: true, jsonLds: [],
    image: { url: origin + img.src, w: img.w, h: img.h, alt: img.alt },
    noscript: noscriptFor({ title: meta.title, description: meta.description }, NOSCRIPT_LINKS),
  });
  html = html.replace(/\s*<link\s+rel="canonical"[^>]*\/>/, "").replace(/\s*<meta\s+property="og:url"[^>]*\/>/, "");
  await fs.writeFile(path.join(dist, "404.html"), html, "utf8");
}

// The blog index changes whenever an article is published.
const newestPost = Object.values(ROUTE_META).map((m) => m.post?.iso).filter(Boolean).sort().pop();
for (const entry of sitemap) if (entry.loc === origin + ROUTE_META.blog.path) entry.lastmod = newestPost;
// Generated, never hand-edited: it cannot drift from the routes. Only real
// dates are given — a lastmod that changes on every build is ignored by search
// engines, so undated pages simply carry none.
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
await fs.writeFile(path.join(dist, "sitemap.xml"), xml, "utf8");

// /llms.txt (llmstxt.org): a Markdown map of the site for AI agents and
// assistants — a title, a one-paragraph summary, then sections of links with
// a note each. Written from the same table as the sitemap, so it cannot list
// a page that no longer exists or miss a new article. Without it the URL was
// answered by the 404 page, which PageSpeed reports as an invalid llms.txt.
{
  const link = (route) => {
    const m = ROUTE_META[route];
    return m?.path && !m.noindex ? `- [${m.title}](${origin + m.path}): ${m.description || ""}`.trimEnd() : null;
  };
  const section = (heading, routes) => {
    const lines = routes.map(link).filter(Boolean);
    return lines.length ? `## ${heading}\n\n${lines.join("\n")}\n` : "";
  };
  const articles = Object.entries(ROUTE_META)
    .filter(([r, m]) => r.startsWith("blog/") && m.post && !m.noindex)
    .sort(([, a], [, b]) => (b.post.iso || "").localeCompare(a.post.iso || ""))
    .map(([r]) => r);
  const txt = [
    `# ${SITE_NAME}`,
    "",
    `> ${ROUTE_META.home.description}`,
    "",
    "Passerelle est une plateforme indépendante, en français, pour les candidats au TCF Canada (Test de connaissance du français pour le Canada, utilisé pour l'immigration et la citoyenneté canadiennes). Le contenu public est consultable sans compte ; les quiz, TCF blancs et analyses IA demandent un compte gratuit ou un abonnement.",
    "",
    section("Préparer le TCF Canada", ["guide", "guide-co", "guide-ce", "guide-ee", "guide-eo", "calculator", "sujets-ee", "sujets-eo"]),
    section("Passerelle", ["home", "pricing", "register", "avis", "faq", "about", "contact"]),
    section("Blogue", ["blog", ...articles]),
    section("Optional", ["terms", "privacy", "accessibility"]),
  ].join("\n");
  await fs.writeFile(path.join(dist, "llms.txt"), txt.trimEnd() + "\n", "utf8");
}

console.log(`prerender: ${written} pages (${indexable} indexable) at ${origin} · sitemap.xml: ${sitemap.length} URLs`);
