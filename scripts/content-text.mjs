// The public pages' TEXT, for readers that do not run JavaScript.
//
// The app draws every page in the browser, so the HTML a crawler receives held
// only a title, a description and a few links: AI crawlers (GPTBot, ClaudeBot,
// PerplexityBot…), which do not execute scripts, knew an article existed but
// not what it said. This module rebuilds the text of the content pages — blog
// articles, the exam guide and its four chapters, the FAQ, the NCLC table —
// from the same constants the pages render, as one list of blocks per route,
// then writes those blocks two ways for scripts/prerender.mjs:
//
//   · blocksToHtml   → each page's <noscript>. Never shown to a visitor (the
//                      browser runs the app instead) and never wiped on mount,
//                      unlike markup injected into #root.
//   · blocksToMarkdown → /llms-full.txt, every page's text in one file.
//
// Blocks share the shape of the blog's article bodies (see
// src/components/blog/ArticleBody.jsx): a string is a paragraph, then
// { h }, { h3 }, { ul }, { ol }, { table: { cols, rows }, caption },
// { note, title }, { img } and { cta: { r, label, text } }. Inline text may
// carry **bold** and [label](/path).
//
// Guides and the FAQ are written here as blocks from their data. When a guide
// page gains a section, add it below, or crawlers will not see it.

import path from "node:path";
import { build } from "esbuild";

// The constants import through the "@" alias and are plain ESM, so they are
// bundled to a temp file — same approach as loadRouteMeta() in prerender.mjs.
// npm packages (lucide-react, for the guide's icons) stay external.
export async function loadContent(root, outDir) {
  const outfile = path.join(outDir, ".content-text.mjs");
  await build({
    stdin: {
      contents: `
        export { POSTS } from "@/constants/blog.js";
        export * as guide from "@/constants/guide.js";
        export * as comprehension from "@/constants/guideComprehension.js";
        export * as ee from "@/constants/guideEE.js";
        export * as eo from "@/constants/guideEO.js";
        export { FAQS } from "@/constants/faq.js";
      `,
      resolveDir: root,
      loader: "js",
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
    alias: { "@": path.join(root, "src") },
  });
  const { rm } = await import("node:fs/promises");
  try {
    return await import(`file://${outfile}?t=${Date.now()}`);
  } finally {
    await rm(outfile, { force: true });
  }
}

/* ------------------------------- documents ------------------------------- */

const pair = (a, b) => (b ? `**${a}** : ${b}` : `**${a}**`);

function comprehensionGuide(g) {
  return [
    g.sub,
    { h: g.skillsTitle },
    { ul: g.skills },
    { h: "Les types de questions" },
    { ul: g.types.map((x) => pair(x.t, x.d)) },
    { h: "Un exemple" },
    g.example.context,
    `**${g.example.question}**`,
    { ul: g.example.options.map((o) => `${o.k}. ${o.txt}`) },
    `Bonne réponse : **${g.example.answer}**. ${g.example.note}`,
    { h: "Conseils" },
    g.tipsIntro,
    { ul: g.tips },
  ];
}

function phraseBank(bank) {
  const out = [{ h3: bank.title }];
  if (bank.intro) out.push(bank.intro);
  for (const s of bank.sections) {
    out.push(`**${s.label}**`);
    if (s.kind === "registers") out.push({ ul: [`Registre amical : ${s.amical.join(" / ")}`, `Registre formel : ${s.formel.join(" / ")}`] });
    else if (s.items) out.push({ ul: s.items });
    else if (s.lines) out.push({ ul: s.lines });
    if (s.note) out.push(s.note);
  }
  return out;
}

function eeGuide(ee) {
  const out = [
    { h: "Ce que l'épreuve évalue" },
    { ul: ee.EE_CRITERIA },
    { h: ee.EE_OFFICIAL_RULES.title },
    ee.EE_OFFICIAL_RULES.intro,
    { ul: ee.EE_OFFICIAL_RULES.items },
    { ul: ee.EE_OFFICIAL_RULES.notes },
  ];
  for (const task of ee.EE_METHOD) {
    out.push({ h: `Tâche ${task.n} · ${task.title} (${task.words})` }, task.brief);
    if (task.note) out.push(task.note);
    if (task.example) out.push(task.example);
    if (task.twoParts) out.push({ ul: task.twoParts.map((p) => pair(p.p, p.d)) });
    if (task.steps) out.push({ h3: task.structureTitle || "La structure" }, { ol: task.steps.map((s) => pair(s.s, s.d)) });
    if (task.altStructure) {
      out.push({ h3: task.altStructure.title }, task.altStructure.example, { ol: task.altStructure.steps.map((s) => pair(s.s, s.d)) });
    }
    if (task.examples) out.push({ ul: task.examples.map((x) => pair(x.label, x.quote)) });
    if (task.phraseBank) out.push(...phraseBank(task.phraseBank));
  }
  return out;
}

function eoGuide(eo) {
  const out = [eo.EO_INTRO];
  for (const task of eo.EO_TASKS) {
    out.push(
      { h: `Tâche ${task.n} · ${task.title}` },
      `${task.time} · ${task.prep}`,
      task.goal,
      { h3: "Exemples de sujets" },
      { ul: task.prompts },
    );
  }
  out.push(
    { h: "La notation" },
    eo.EO_SCORING,
    { table: { cols: ["Niveau", "Ce que vous savez faire à l'oral"], rows: eo.EO_LEVELS.map((l) => [l.lvl, l.d]) } },
    { h: "Conseils pour progresser" },
    eo.EO_TIPS_INTRO,
    { ul: eo.EO_TIPS },
    { h: "Bon à savoir le jour J" },
    { ul: eo.EO_KNOW },
  );
  return out;
}

const nclcTable = (g) => ({
  table: {
    cols: ["NCLC", "Compréhension orale /699", "Compréhension écrite /699", "Expression orale /20", "Expression écrite /20"],
    rows: g.NCLC_ROWS.map((r) => [r.nclc, r.co, r.ce, r.eo, r.ee]),
  },
  caption: "Correspondance entre les résultats du TCF Canada et les niveaux NCLC.",
});

function examGuide(g) {
  const out = [{ h: "Les quatre épreuves" }];
  for (const e of g.GUIDE_EPREUVES) out.push({ h3: e.name }, `${e.detail} · ${e.time}`, e.long);
  out.push(
    { h: "Score et niveaux du CECRL" },
    { table: { cols: ["Niveau", "Score /699"], rows: g.CECRL_SCALE.map((r) => [r.lvl, r.range]) } },
    { h: "Correspondance avec les NCLC" },
    nclcTable(g),
    { h: "Expression écrite : les trois tâches" },
    { ol: g.EE_TASKS.map((x) => `${x.d} (${x.meta})`) },
    { h: "Expression orale : les trois tâches" },
    { ol: g.EO_TASKS.map((x) => `${x.d} (${x.meta})`) },
    { h: "Le jour de l'examen : à prévoir" },
    { ul: g.EXAM_DO },
    { h: "Ce qui est interdit" },
    { ul: g.EXAM_DONT },
  );
  return out;
}

// Route key -> blocks, for every content page that has text worth reading.
// The other routes (tools, account pages) keep the short <noscript>.
export function contentDocs(content, ROUTE_META) {
  const docs = {};
  const { POSTS, guide, comprehension, ee, eo, FAQS } = content;

  for (const post of POSTS) {
    if (!ROUTE_META[`blog/${post.slug}`]) continue;
    docs[`blog/${post.slug}`] = [`Publié le ${post.date} · ${post.cat}`, ...post.body];
  }
  docs.blog = [{ ul: POSTS.map((p) => `[${p.t}](/blogue/${p.slug}) — ${p.excerpt}`) }];
  docs.guide = examGuide(guide);
  docs["guide-co"] = comprehensionGuide(comprehension.CO_GUIDE);
  docs["guide-ce"] = comprehensionGuide(comprehension.CE_GUIDE);
  docs["guide-ee"] = eeGuide(ee);
  docs["guide-eo"] = eoGuide(eo);
  docs.faq = FAQS.filter((f) => !f.dzOnly).flatMap((f) => [{ h: f.q }, f.a, ...(f.steps ? [{ ol: f.steps }] : [])]);
  docs.calculator = [
    "Le calculateur convertit vos scores du TCF Canada en niveaux de compétence linguistique canadiens (NCLC), compétence par compétence, selon le tableau ci-dessous.",
    nclcTable(guide),
  ];
  return docs;
}

/* -------------------------------- renderers ------------------------------ */

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// **bold** and [label](href) — the only inline markup the content uses.
function inlineHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const routePath = (ROUTE_META, r) => ROUTE_META[r]?.path || "/";

export function blocksToHtml(blocks, ROUTE_META) {
  const li = (items) => items.map((x) => `<li>${inlineHtml(x)}</li>`).join("");
  return blocks.map((b) => {
    if (typeof b === "string") return `<p>${inlineHtml(b)}</p>`;
    if (b.h) return `<h2>${inlineHtml(b.h)}</h2>`;
    if (b.h3) return `<h3>${inlineHtml(b.h3)}</h3>`;
    if (b.ul) return `<ul>${li(b.ul)}</ul>`;
    if (b.ol) return `<ol>${li(b.ol)}</ol>`;
    if (b.table) {
      const head = b.table.cols.map((c) => `<th>${inlineHtml(c)}</th>`).join("");
      const rows = b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`).join("");
      return `<table>${b.caption ? `<caption>${inlineHtml(b.caption)}</caption>` : ""}<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    if (b.note) return `<aside>${b.title ? `<strong>${inlineHtml(b.title)}</strong> ` : ""}${inlineHtml(b.note)}</aside>`;
    if (b.cta) return `<p>${inlineHtml(b.cta.text)} <a href="${escapeHtml(routePath(ROUTE_META, b.cta.r))}">${inlineHtml(b.cta.label)}</a></p>`;
    return ""; // images: decorative here
  }).join("\n");
}

export function blocksToMarkdown(blocks, ROUTE_META, origin) {
  // Relative links become absolute: the file is read out of context.
  const abs = (s) => String(s).replace(/\]\((\/[^)\s]*)\)/g, `](${origin}$1)`);
  const cell = (s) => abs(s).replace(/\|/g, "\\|");
  return blocks.map((b) => {
    if (typeof b === "string") return abs(b);
    if (b.h) return `## ${abs(b.h)}`;
    if (b.h3) return `### ${abs(b.h3)}`;
    if (b.ul) return b.ul.map((x) => `- ${abs(x)}`).join("\n");
    if (b.ol) return b.ol.map((x, i) => `${i + 1}. ${abs(x)}`).join("\n");
    if (b.table) {
      const { cols, rows } = b.table;
      return [
        ...(b.caption ? [`*${abs(b.caption)}*`, ""] : []),
        `| ${cols.map(cell).join(" | ")} |`,
        `| ${cols.map(() => "---").join(" | ")} |`,
        ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
      ].join("\n");
    }
    if (b.note) return `> ${b.title ? `**${abs(b.title)}** ` : ""}${abs(b.note)}`;
    if (b.cta) return `${abs(b.cta.text)} → [${b.cta.label}](${origin}${routePath(ROUTE_META, b.cta.r)})`;
    return null;
  }).filter((x) => x != null && x !== "").join("\n\n");
}
