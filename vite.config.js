import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bankManifestPlugin } from "./scripts/bankManifestPlugin.mjs";
import { sujetsLatestPlugin } from "./scripts/sujetsLatestPlugin.mjs";
import { announcementBarPlugin } from "./scripts/announcementBarPlugin.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Everything under /api goes to the API server EXCEPT /api/_lib/: those are
// shared modules the client imports too (scoreBands, sale, eoLines...), which
// Vite itself must serve in dev. Proxied, they came back as a 500 and blanked
// the page whenever the API server wasn't running. Vercel never serves _lib
// as functions (underscore folders are excluded), so nothing real is lost.
const apiProxy = () => ({
  "^/api/(?!_lib/)": {
    target: `http://localhost:${process.env.DEV_API_PORT || 3001}`,
    changeOrigin: true,
  },
});

// experimentalMinChunkSize (below) folds small lazy pages into shared chunks,
// which drops them from Vite's manifest. This records, for every source
// module, the chunk that ended up holding it, so scripts/prerender.mjs can
// still preload those pages' code from their HTML (it deletes the file after,
// so it is never deployed).
const moduleChunksPlugin = () => ({
  name: "module-chunks",
  apply: "build",
  generateBundle(_, bundle) {
    const modules = {};
    const chunks = {};
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== "chunk") continue;
      chunks[chunk.fileName] = { isEntry: chunk.isEntry, imports: chunk.imports };
      for (const id of chunk.moduleIds) {
        const rel = path.relative(dirname, id).replace(/\\/g, "/");
        if (rel.startsWith("src/")) modules[rel] = chunk.fileName;
      }
    }
    this.emitFile({ type: "asset", fileName: ".vite/module-chunks.json", source: JSON.stringify({ modules, chunks }) });
  },
});

export default defineConfig({
  plugins: [react(), bankManifestPlugin({ root: dirname }), sujetsLatestPlugin({ root: dirname }), announcementBarPlugin(), moduleChunksPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  // Vite serves no serverless functions, so /api/* would 404 under plain
  // `npm run dev`. scripts/dev-api.mjs runs the same api/ handlers on 3001;
  // start it with `npm run dev:api` (or use `vercel dev` for the real thing).
  // With nothing listening there, /api/* fails as a proxy error instead of a
  // silent 404 — a clearer signal that the API server simply isn't running.
  //
  // Both servers need it. `vite preview` serves dist/ with an SPA fallback, so
  // without a proxy of its own it answers /api/dictee with index.html — HTML,
  // status 200 — which surfaces to the user as a JSON parse error on a page
  // that otherwise looks perfectly healthy.
  server: { proxy: apiProxy() },
  // Chunking is tuned for request count: every file a page loads is one
  // Vercel CDN request, and the Hobby plan caps those at 1M / 30 days. Left
  // alone, Rollup gave each lucide icon shared by two lazy pages its own
  // ~1 KB chunk (check.js, star.js, clock.js…), so a single page view cost
  // ~60 requests. All icons now ship as one "icons" chunk, and any other
  // shared chunk under the minimum size is merged into its importer.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
        experimentalMinChunkSize: 5_000,
      },
    },
  },
  preview: { proxy: apiProxy() },
});
