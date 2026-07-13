# Passerelle · Préparation au TCF Canada.

A web app for practicing the TCF Canada French proficiency exam — listening,
reading, writing, speaking, grammar, and vocabulary exercises backed by a
local question bank, plus mock exams, progress tracking, and pricing/auth
pages.

This is a private project. Please don't share access or redistribute the
exam question bank outside the team.

## Tech stack

- [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/) icons
- ESLint for linting

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build locally
npm run lint       # run ESLint
```

The `@/` import alias resolves to `src/` (see `vite.config.js` / `jsconfig.json`).

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. `VITE_`-prefixed vars are
inlined into the client bundle **at build time** (changing one requires a
rebuild/redeploy, not just an env edit); the rest are server-only (used by
`api/*`) and must never carry a `VITE_` prefix. Quiz media can be served as
short-lived signed URLs with opaque names by setting `VITE_SIGNED_MEDIA=true`
and `MEDIA_SECRET` — see `scripts/rename-media.mjs` for the one-time rollout.

## Project structure

```
src/
├── bank/         Question bank: JSON quizzes per section (co/ce/ee/eo)
│                 and bulk audio/image files in bank/media/
├── components/   UI components, grouped by feature area
├── context/      App-wide React context (route, theme, toasts, ...)
├── hooks/        Reusable hooks (countdown, theme, toast, writing/speaking, ...)
├── pages/        Top-level pages (Home, Practice, Listening, Reading,
│                 Writing, Speaking, Grammar, Vocabulary, Mocks, Dashboard,
│                 Pricing, Admin, ...)
├── services/     Data-loading services (question bank, custom listening)
├── styles/       Global styles
└── utils/        Shared utilities
```

## Question bank

Drop quiz JSON files into `src/bank/{co,ce,ee,eo}/` and matching audio/image
files into `src/bank/media/audio|images/` — see `src/bank/README.md` for
the exact file-naming and format conventions. Files are picked up
automatically at dev-server and build time via `import.meta.glob`, no manual
registration needed.
