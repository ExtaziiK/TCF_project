// Vite plugin: `virtual:sujets-latest` = { ee: "2026-08", eo: "2026-08" } — the
// newest month in the shipped subjects archive (data/sujets/sujets-<section>.json).
// The nav names its "Sujets du mois" link after that month; reading it here
// costs nothing at runtime, where the files themselves are ~650 KB each.
// Months added later by an admin live in Supabase, and
// src/services/sujetsLatestService.js layers them on top.

import fs from "node:fs/promises";
import path from "node:path";

const ID = "virtual:sujets-latest";
const SECTIONS = ["ee", "eo"];
const key = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

async function latestOf(file) {
  try {
    const json = JSON.parse(await fs.readFile(file, "utf8"));
    let best = typeof json.latest === "string" ? json.latest : null;
    for (const y of json.years || []) for (const m of y.months || []) {
      const k = key(y.year, m.monthNum);
      if (!best || k > best) best = k;
    }
    return best;
  } catch {
    return null;
  }
}

export function sujetsLatestPlugin({ root }) {
  const fileFor = (s) => path.join(root, "data/sujets", `sujets-${s}.json`);
  return {
    name: "sujets-latest",
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    async load(id) {
      if (id !== `\0${ID}`) return null;
      const out = {};
      for (const s of SECTIONS) {
        this.addWatchFile(fileFor(s));
        out[s] = await latestOf(fileFor(s));
      }
      return `export default ${JSON.stringify(out)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!SECTIONS.some((s) => path.resolve(file) === path.resolve(fileFor(s)))) return;
      const mod = server.moduleGraph.getModuleById(`\0${ID}`);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
