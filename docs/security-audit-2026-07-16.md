# Security audit & hardening — 2026-07-16

Full-application pass (OWASP-aligned) over the Vite/React SPA, the Vercel serverless API, and the Supabase schema. Builds on the 2026-07-14 audit (premium gating, signed media, single-session, login lockout — see git history).

**Security score: 7.5/10 before → 9/10 after.** The pre-existing posture was already strong (no XSS sinks, RLS everywhere, server-side premium checks); this pass closed the transport/abuse layer: security headers + CSP, platform-wide rate limiting, payload bounds, and error-message hygiene.

## 1. Vulnerabilities found & fixed

| # | Finding | Risk | Location | Fix |
|---|---------|------|----------|-----|
| 1 | No HTTP security headers at all (no CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | **Medium** | `vercel.json` | Added strict CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, connect limited to self + Supabase) plus HSTS (2 y), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy (mic self-only, camera/geo/payment denied), COOP |
| 2 | Unauthenticated Stripe-proxying endpoints had no rate limit (promo-code enumeration, Stripe quota burn) | **Medium** | `api/promo-validate.js:9`, `api/prices.js:9` | DB-backed fixed-window limiter: 20/min/IP (promo) and 30/min/IP (prices); ids capped at 10 and format-validated (`^price_[A-Za-z0-9]{8,64}$`) |
| 3 | Billable AI endpoints (Groq + Azure TTS) had auth but no volume cap — a scripted Premium account could burn the AI budget | **Medium** | `api/expression-ecrite.js:21`, `api/expression-orale.js:214` | Per-user rate limits: 10/5 min (written), 30/5 min (oral, sized for real interview cadence) |
| 4 | Login had a per-account lockout but no per-IP cap → password spraying across many accounts was unthrottled | **Medium** | `api/login.js:24` | Added 20/min/IP limit on top of the existing `email\|ip` lockout; identifier length clamped |
| 5 | `priceId` accepted verbatim — any price in the Stripe account (legacy/test) could be checked out | **Low–Med** | `api/create-checkout-session.js:22` | Format validation + server-side check that the price exists, is active, and is recurring; 5/min/user rate limit |
| 6 | Internal error messages (Stripe SDK, etc.) returned to clients in 500 responses | **Low** | `api/create-checkout-session.js`, `api/create-portal-session.js`, `api/prices.js` | Generic client messages; details go to server logs only |
| 7 | Unbounded request fields: base64 audio, `prompt`/`taskLabel`/`targetWords` interpolated into AI prompts | **Low** | `api/expression-orale.js`, `api/expression-ecrite.js` | `decodeAudio()` rejects > ~4.5 MB (413); all prompt-side fields length-clamped (200/1000/20 chars) |
| 8 | Media-signing endpoint could be polled in a loop to hoard signed URLs | **Low** | `api/media.js:20` | 30/min/user rate limit (one call already signs a whole quiz) |
| 9 | No automated security tests | **Low** | — | `tests/security.test.mjs` (`npm test`): XSS payloads through React rendering, hostile AI output through `normalizeFeedback`, SSML injection through `xmlEscape`, username-format tripwire |

New infrastructure: `api/_lib/ratelimit.js` + `supabase/migrations/20260716_rate_limits.sql` (atomic `bump_rate_limit()` RPC, service-role only, RLS enabled with no policies, opportunistic stale-row cleanup; endpoints degrade to a per-instance in-memory counter until the migration is run).

## 2. Verified safe (no change needed)

- **XSS / injection sinks**: zero uses of `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`, `eval`, `new Function`, string `setTimeout`/`setInterval` anywhere in `src/`, `api/`, `scripts/`, `public/`. All user content renders through JSX auto-escaping.
- **SQL/NoSQL injection**: no raw SQL with user input anywhere — all DB access goes through supabase-js (PostgREST, parameterized). Migrations contain static DDL only.
- **Stored XSS at the data layer**: usernames DB-constrained to `^[a-z0-9_.-]{3,30}$` (markup impossible); contact messages CHECK-bounded (120/200/200/4000) with RLS insert-own/admin-read; question content admin-only via RLS.
- **URL injection**: no user-controlled `href`; `mailto:` scheme is fixed; media `src` values are server-signed URLs or admin-entered; all `target="_blank"` links carry `rel="noreferrer"`.
- **Auth**: Supabase JWT Bearer on every state-changing endpoint (`requireUser` → `requirePremium`/`requireAdmin` from server-controlled `app_metadata`); single-active-session enforced server-side; role/plan not client-editable; admin actions audit-logged; self-demotion/self-deletion blocked.
- **CSRF**: not applicable by construction — auth is `Authorization`-header token, not cookies, so cross-site requests can't carry credentials.
- **Stripe webhook**: signature verified against `STRIPE_WEBHOOK_SECRET` on the raw body; metadata merge preserves unrelated fields.
- **TTS/SSML**: examiner lines XML-escaped before SSML interpolation (`api/_lib/tts.js`).
- **Secrets**: none in the repo (scanned for key patterns); all keys via env vars; `.env*` git-ignored with `.env.example` as template; `GROQ_API_KEY`/`SERVICE_ROLE_KEY`/`MEDIA_SECRET`/`AZURE_SPEECH_KEY` are server-side only.
- **File upload**: admin-only (RLS), filename sanitized (`[^\w.-] → _`), extension pinned by bucket type; buckets serve media, not HTML.
- **Dependencies**: `npm audit` — **0 vulnerabilities** (prod and dev). Stack is small and current (React 18, supabase-js 2, Stripe 22, Vite 6).

## 3. Action required after deploy

1. **Run `supabase/migrations/20260716_rate_limits.sql`** in the Supabase SQL editor (until then, rate limiting is per-instance best-effort — nothing breaks).
2. Confirm `20260714_security_hardening.sql` was run (prerequisite from the previous audit).
3. After the first deploy, click through checkout, the speaking workshop, and quiz media once — if the CSP blocks something legitimate, the browser console will name the directive.

## 4. Remaining recommendations (accepted / future)

- **Supabase session tokens live in `localStorage`** (supabase-js default). Moving to HttpOnly cookies requires a BFF/token-proxy layer that a pure SPA on Vercel Hobby doesn't have. Mitigations in place: zero HTML-injection sinks, strict CSP, `connect-src` allowlist. Revisit if the app ever gains rich-text/HTML rendering.
- **Question bank JSON (with answers) ships in the client bundle** — known architecture decision; full fix = server-delivered content + server-side grading.
- **`uploadMedia` returns public URLs** — breaks silently if the buckets flip private; migrate to the signed-URL path when convenient.
- `style-src 'unsafe-inline'` is required by React inline `style` props; tightening means refactoring those to classes — low value while `script-src` is strict.
- If HTML rendering is ever introduced (rich text, markdown), add DOMPurify at that moment — today there is nothing to sanitize because nothing renders raw HTML.
- Optional: Supabase Auth CAPTCHA on signup if bot registrations appear.
