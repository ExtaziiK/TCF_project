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

export default defineConfig({
  plugins: [react(), bankManifestPlugin({ root: dirname }), sujetsLatestPlugin({ root: dirname }), announcementBarPlugin()],
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
  // scripts/prerender.mjs reads the manifest to preload each route's page
  // chunk from its own HTML, then deletes it so it is never deployed.
  build: { manifest: true },
  preview: { proxy: apiProxy() },
});
