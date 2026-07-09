---
name: verify
description: Build, launch and drive the Passerelle TCF Canada app (Vite + React SPA) to verify changes at the UI surface.
---

# Verifying changes in this app

- Launch: `npm run dev` (Vite, http://localhost:5173). `npm run build` + `npm run preview` for prod build. `npm run lint` for ESLint.
- The app is a single-page React app with **no URL routing** — the route lives in React state (`AppProvider`). You cannot deep-link to `/pricing`; drive navigation by clicking nav/footer buttons.
- Headless driving that works on this machine: install `playwright` in a scratch dir (`npm i playwright`) and launch with `chromium.launch({ channel: "msedge", headless: true })` — uses the system Edge, no browser download.
- Auth is Supabase-backed; the signed-out landing renders without credentials. Signed-in flows need a real account.
- i18n: UI is authored in French; English comes from `src/i18n/en.js` (dictionary keyed by exact French strings, falls back to French). Language toggle is the EN/FR button in the nav; persisted in `localStorage["passerelle.lang"]` and mirrored to `document.documentElement.lang`. When verifying translated screens, check both the visible text and that untranslated strings still render (fallback).
- Gotcha: exam/quiz content (questions, audio, options) is intentionally French in both languages — don't flag it as a missing translation.
