import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const apiProxy = () => ({
  "/api": {
    target: `http://localhost:${process.env.DEV_API_PORT || 3001}`,
    changeOrigin: true,
  },
});

export default defineConfig({
  plugins: [react()],
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
  preview: { proxy: apiProxy() },
});
