# Security audit & hardening — 2026-07-27

OWASP-aligned XSS/injection pass over the Vite/React SPA, the Vercel serverless
API, and the Supabase schema. Follows up on the 2026-07-16 audit (which took the
app from 7.5 → 9/10: security headers + CSP, platform-wide rate limiting, payload
bounds). This pass re-scanned everything and closed the two regressions
introduced by features shipped **after** that audit.

**Security score: 9/10 maintained.** Two items added since July had quietly
eroded the posture (an unsanitized-by-DOMPurify HTML sink + a vulnerable mail
dependency); both are now fixed. No new architectural weaknesses found.

## 1. Findings this pass & fixes

| # | Finding | Risk | Location | Fix |
|---|---------|------|----------|-----|
| 1 | `nodemailer@6.10.1` carries a **high**-severity advisory (SMTP command injection, CRLF header injection, addressparser DoS, etc.) — added for the subscription-reminder email feature | **High** (advisory) / Low (real-world: `to`/`subject`/`html` are server-generated, `to` is a DB-validated user email) | `package.json`, `api/_lib/mailer.js` | Upgraded to `nodemailer@9.x`. `npm audit --omit=dev` (runtime deps) now reports **0 vulnerabilities** |
| 2 | Rich-text home banner renders admin HTML via `dangerouslySetInnerHTML` using a **hand-rolled** sanitizer — the prior audit's recommendation was to adopt DOMPurify the moment HTML rendering was introduced (it now has been) | **Low** (the walker was already a safe DOMParser whitelist; input is admin-only) | `src/utils/richText.js`; sinks at `src/pages/Admin.jsx:206`, `src/components/home/HomeLabel.jsx:54` | Added **DOMPurify** as the authoritative final gate over the whitelist walk (defence-in-depth); extracted the link-scheme allowlist as `isSafeUrl` (http/https/mailto only) |
| 3 | No automated test on the new HTML sink; `npm test` also failed to discover tests under Node 24 (`node --test tests/`) | **Low** | `tests/security.test.mjs`, `package.json` | Added a scheme-allowlist tripwire test (rejects `javascript:`/`data:`/`vbscript:`); fixed the test script to a portable glob so `npm test` runs the suite (5/5 pass) |

## 2. Verified safe (no change needed) — mapped to the requested phases

- **XSS sinks (Phase 2, 7):** the **only** `dangerouslySetInnerHTML` in the app is the admin banner (now DOMPurify-gated). Zero `innerHTML` (except the admin rich-text *editor*, which reads/writes the admin's own contentEditable and is re-sanitized on render), zero `outerHTML`, `document.write`, `insertAdjacentHTML`, `eval`, `new Function`, or string `setTimeout`/`setInterval`. Every other user value renders through JSX auto-escaping.
- **HTML sanitization (Phase 3):** DOMPurify installed and configured; the one HTML fragment (banner) is sanitized twice.
- **Output encoding / React (Phase 7):** all `target="_blank"` links carry `rel="noreferrer"` (implies noopener) or `noopener noreferrer`; `window.open(..., "noopener")`; no user-controlled `href`, no inline event handlers from input, no dynamic script/iframe creation.
- **Backend validation (Phase 4, 8):** every state-changing endpoint runs `requireUser → requirePremium/requireAdmin`; prompt-side fields length-clamped (200/1000/20), base64 audio capped (~4.5 MB), `priceId` format-validated, promo codes bounded. Rate limits on login (20/min/IP), AI (10–30/window/user), promo/prices/media/checkout.
- **DB (Phase 9):** all access via supabase-js (PostgREST, parameterized) — no string-built SQL anywhere; migrations are static DDL. Usernames DB-constrained to `^[a-z0-9_.-]{3,30}$` (markup impossible); contact/subscription rows CHECK-bounded with RLS.
- **Cookies / CSRF (Phase 5, 11):** auth is a Supabase JWT in the `Authorization` header, not cookies — so cross-site requests can't carry credentials (CSRF N/A by construction). No app-set auth cookies to flag `HttpOnly`.
- **CSP & headers (Phase 6):** `script-src 'self'` (**no** `unsafe-inline` for scripts — blocks inline/injected script), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `connect-src` allowlisted to self + Supabase, plus HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP.
- **File upload (Phase 10):** admin-only via RLS; filename sanitized (`[^\w.-]→_`); extension pinned by bucket; receipts bucket is private and served through short-lived signed URLs; buckets serve media, never HTML.
- **Auth (Phase 11):** single active session enforced server-side; admin disconnect/session-revoke; role/plan from server-controlled `app_metadata` (not client-editable); self-demotion/self-deletion blocked; audit log; Stripe webhook signature-verified.
- **Dependencies (Phase 13):** runtime deps **0 vulnerabilities**. Remaining `npm audit` items are **dev/build-time only** (`postcss`, `brace-expansion` via vite/tailwind/eslint) — not shipped to production, not reachable at runtime.
- **Tests (Phase 14):** `tests/security.test.mjs` throws `<script>`, `<img onerror>`, `javascript:`, `"><svg onload>`, `<iframe srcdoc>`, and SQL payloads at React rendering, `normalizeFeedback`, `xmlEscape`, the username constraint, and the rich-text link allowlist — all asserted inert.

## 3. Remaining recommendations (accepted / architectural)

- **Supabase session tokens live in `localStorage`** (supabase-js default; Phase 12). Moving to `HttpOnly` cookies needs a BFF/token-proxy that a pure SPA on Vercel Hobby doesn't have. Compensating controls: strict CSP, the single HTML sink now DOMPurify-gated, `connect-src` allowlist. **Recommended only if** the app later renders more user-authored HTML/markdown.
- **Dev-toolchain advisories** (`postcss`, `brace-expansion`) — fixing needs breaking major bumps of vite/tailwind/eslint; build-time only, so deferred. Re-evaluate at the next major upgrade.
- **`style-src 'unsafe-inline'`** — required by React inline `style` props; low value to remove while `script-src` is strict.
- **Question-bank JSON (with answers) ships in the client bundle** — known design; full fix is server-delivered content + server-side grading.
- Optional: Supabase Auth CAPTCHA on signup if bot registrations appear.

## 4. Action required after deploy

- None for this pass beyond the usual deploy. The reminder-email feature still needs `SMTP_USER` / `SMTP_PASS` / `CRON_SECRET` set in Vercel before it sends anything (unchanged).
- Prior migrations (`20260716_rate_limits.sql`, `20260714_security_hardening.sql`) remain prerequisites — confirm they were run.
