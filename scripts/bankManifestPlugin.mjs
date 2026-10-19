// Vite plugin for the question bank (src/bank/<section>/*.json).
//
// The bank is ~20 MB of JSON. bankService loads it lazily, one chunk per quiz
// file, so nothing of it sits in the entry bundle. What the landing page, the
// Épreuves grid and the dashboard need is only its SHAPE — which quizzes exist,
// in what order, with how many questions — and that is what this plugin
// computes at build time:
//
//   virtual:bank-manifest      { co: [{ id, title, section, quizNumber, count, kind? }], ce, ee, eo }
//                              tiny, imported eagerly
//   virtual:bank-question-ids  [{ id, title, section, quizNumber, ids: [questionId…] }]
//                              ~100 KB, imported lazily — lets the dashboard
//                              count Carnet cards without loading every quiz
//   virtual:bank-demo-ce       [{ order, q, opts, a, exp }] — the landing CE
//                              demo's questions (src/constants/demoPool.js),
//                              a few KB, so the home page needs no quiz chunk
//
// Both are produced by running the app's own adaptBankFile over the files, so
// they cannot disagree with what the quiz engine later builds from the chunk.
//
// It also strips each CO question's word-timing array (`words`) and
// `transcript` from the shipped JSON: the adapter never reads them, and they
// are most of a CO file's weight.

import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SECTIONS = ["co", "ce", "ee", "eo"];
const MANIFEST_ID = "virtual:bank-manifest";
const IDS_ID = "virtual:bank-question-ids";
const DEMO_CE_ID = "virtual:bank-demo-ce";
const VIRTUAL = [MANIFEST_ID, IDS_ID, DEMO_CE_ID];
const resolved = (id) => `\0${id}`;

// Same order as bankService's sort.
const byQuiz = (a, b) => (a.quizNumber ?? 1e9) - (b.quizNumber ?? 1e9) || a.title.localeCompare(b.title);

// Fields the adapter never reads, dropped from series-format questions.
const UNUSED_QUESTION_FIELDS = ["words", "transcript"];

function stripUnused(data) {
  if (data && !Array.isArray(data) && Array.isArray(data.questions)) {
    for (const q of data.questions) {
      if (q && typeof q === "object") for (const f of UNUSED_QUESTION_FIELDS) delete q[f];
    }
  }
  return data;
}

export function bankManifestPlugin({ root }) {
  const bankDir = path.join(root, "src/bank");
  const isBankJson = (id) => {
    const rel = path.relative(bankDir, id.split("?")[0]).split(path.sep);
    return rel.length === 2 && SECTIONS.includes(rel[0]) && rel[1].endsWith(".json");
  };

  let adapterPromise = null;
  // bankAdapter.js imports through the "@" alias and reads import.meta.env, so
  // Node can't import it as is: bundle it to a data URL first (as
  // scripts/prerender.mjs does for seo.js). The env values only shape media
  // URLs, which the manifest doesn't carry; signed mode is on so every
  // question carries its `sign` descriptor, i.e. its real question order.
  const loadAdapter = () =>
    (adapterPromise ||= build({
      entryPoints: [path.join(root, "src/utils/bankAdapter.js")],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      alias: { "@": path.join(root, "src") },
      define: { "import.meta.env": JSON.stringify({ VITE_SIGNED_MEDIA: "true" }) },
    }).then((out) => import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`)));

  async function scan(ctx) {
    const { adaptBankFile } = await loadAdapter();
    const manifest = Object.fromEntries(SECTIONS.map((s) => [s, []]));
    const ids = [];
    const { CE_DEMO_QUIZ, CE_DEMO_ORDERS } = await import(`${pathToFileURL(path.join(root, "src/constants/demoPool.js")).href}?t=${Date.now()}`);
    let demoCe = [];
    for (const section of SECTIONS) {
      const dir = path.join(bankDir, section);
      let files = [];
      try { files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")); } catch { /* section folder absent */ }
      ctx?.addWatchFile?.(dir);
      for (const fileName of files) {
        const file = path.join(dir, fileName);
        ctx?.addWatchFile?.(file);
        const raw = stripUnused(JSON.parse(await fs.readFile(file, "utf8")));
        const quiz = adaptBankFile(raw, { section, fileName, audioMap: {}, imageMap: {} });
        if (!quiz) continue;
        manifest[section].push({
          id: quiz.id,
          title: quiz.title,
          section,
          quizNumber: quiz.quizNumber,
          count: quiz.questions.length,
          ...(quiz.kind ? { kind: quiz.kind } : {}),
        });
        ids.push({ id: quiz.id, title: quiz.title, section, quizNumber: quiz.quizNumber, ids: quiz.questions.map((q) => q.id) });
        if (section === "ce" && quiz.quizNumber === CE_DEMO_QUIZ) {
          demoCe = quiz.questions
            .map((q, i) => ({ order: q.sign?.order ?? i + 1, q: q.q, opts: q.opts, a: q.a, exp: q.exp }))
            .filter((q) => CE_DEMO_ORDERS.includes(Number(q.order)));
        }
      }
      manifest[section].sort(byQuiz);
    }
    return { manifest, ids, demoCe };
  }

  // Both virtual modules come from one pass over the files.
  let scanPromise = null;
  const scanOnce = (ctx) => (scanPromise ||= scan(ctx));

  return {
    name: "bank-manifest",
    enforce: "pre",
    resolveId(id) {
      if (VIRTUAL.includes(id)) return resolved(id);
      return null;
    },
    async load(id) {
      if (id === resolved(MANIFEST_ID)) return `export default ${JSON.stringify((await scanOnce(this)).manifest)};`;
      if (id === resolved(IDS_ID)) return `export default ${JSON.stringify((await scanOnce(this)).ids)};`;
      if (id === resolved(DEMO_CE_ID)) return `export default ${JSON.stringify((await scanOnce(this)).demoCe)};`;
      return null;
    },
    transform(code, id) {
      if (!isBankJson(id)) return null;
      return { code: JSON.stringify(stripUnused(JSON.parse(code))), map: null };
    },
    // A bank file edited under `vite dev` changes the manifest too.
    handleHotUpdate({ file, server }) {
      if (!isBankJson(file)) return;
      scanPromise = null;
      for (const v of VIRTUAL) {
        const mod = server.moduleGraph.getModuleById(resolved(v));
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
    },
  };
}
