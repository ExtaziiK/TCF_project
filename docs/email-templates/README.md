# Transactional email templates

Branded replacements for Supabase's default auth emails. These are **not**
bundled by the app — they live here as the source of truth, and are pasted into
the Supabase dashboard by hand.

## Where they go

Supabase dashboard → **Authentication → Emails → Templates** → pick the
template → paste the subject and the message body → **Save**.

| File | Supabase template | Subject line |
|---|---|---|
| [`reset-password.html`](reset-password.html) | Reset Password | `Réinitialisez votre mot de passe Passerelle` |
| [`confirm-signup.html`](confirm-signup.html) | Confirm signup | `Votre code de confirmation Passerelle` |

Paste the file's whole contents, `<!DOCTYPE html>` included — Supabase sends the
body as-is, so a complete document is what gets delivered.

## Confirm signup sends a CODE, not a link

`confirm-signup.html` shows `{{ .Token }}` — the six digits the candidate types
back into the tab they signed up in (`verifySignupCode` in
`src/services/authService.js`).

**Do not add `{{ .ConfirmationURL }}` to that template.** The link and the code
are the *same single-use token*. Mail providers fetch every link in an incoming
message to scan it, and that GET redeems the token — which is precisely how the
password-reset email used to fail with `otp_expired`. A link sitting next to the
code would let a scanner silently kill the code before the candidate types it.
A scanner cannot spend a code, because it does not type.

The same choice also fixes a cross-device annoyance: a link opened on a phone
creates the session there, leaving the laptop the candidate actually signed up
on still unconfirmed.

Two settings worth checking under **Authentication → Providers → Email**:

- **Confirm email** must be ON, or `signUp` returns a session immediately and
  the code screen never appears.
- **Email OTP expiration** defaults to 1 hour. The template says "valable une
  heure" — change both together if you shorten it.

## Brand values used

Taken from the app, not invented — keep them in sync if the site's change.

| Token | Value | Source |
|---|---|---|
| Brand gradient | `#2E6BE6 → #6C4FE0 → #D8354A` | `.grad-brand`, [src/styles](../../src/styles) |
| Accent / buttons | `#2E6BE6` | same gradient's start; matches the app's `blue-600` UI accent |
| Page canvas | `#f1f5f9` (slate-100) | app canvas is `bg-slate-50`, one step up for card contrast |
| Card / borders | `#ffffff` / `#e2e8f0` | `getTheme()`, [src/constants/theme.js](../../src/constants/theme.js) |
| Text / muted | `#0f172a` / `#475569` / `#64748b` | `getTheme()` light palette |
| Logo | `https://www.tcfpasserelle.com/logo-full.png` | [public/logo-full.png](../../public/logo-full.png) |
| Language | French | app default, [src/i18n/index.js](../../src/i18n/index.js) |
| Contact address | `contact@tcfpasserelle.com` | the mailbox the auth SMTP sender authenticates as |

The "valide 30 minutes" wording matches what the app already tells the user on
the reset screen (`AuthPage.jsx`), so the two can't contradict each other. If
you change the OTP expiry in Supabase, change both.

## Template variables

Supabase substitutes these server-side (Go template syntax):

- `{{ .TokenHash }}` + `{{ .SiteURL }}` — combined into the link the button
  points at. **Required.**
- `{{ .Email }}` — the recipient's address, shown so they can tell which account
  the request was for.
- Also available if ever needed: `{{ .Token }}` (6-digit code),
  `{{ .ConfirmationURL }}`, `{{ .RedirectTo }}`.

## Why the link is not `{{ .ConfirmationURL }}`

This is the important part — do not "simplify" it back.

`{{ .ConfirmationURL }}` points at Supabase's `/auth/v1/verify`, which redeems
the token on a plain **GET**. Recovery tokens are single-use, and mail providers
(Gmail above all) fetch every link in an incoming message to scan it for
malware. That scan spends the token, so the human's click lands on an
already-used link and gets bounced to the site with:

```
#error=access_denied&error_code=otp_expired
&error_description=Email+link+is+invalid+or+has+expired
```

Confirmed against this project: hitting a freshly minted link once returns a
session, hitting the very same link a second time returns exactly that error.

The template therefore links to the app instead:

```
{{ .SiteURL }}/nouveau-mot-de-passe?token_hash={{ .TokenHash }}&type=recovery
```

A scanner fetching that URL only receives static HTML. The token is redeemed by
`supabase.auth.verifyOtp()` in JavaScript — which scanners do not run — so it
survives until the user actually clicks. The page lives at
[src/pages/ResetPassword.jsx](../../src/pages/ResetPassword.jsx); if that route
ever moves, this link has to move with it.

`{{ .SiteURL }}` is whatever is set under Authentication → URL Configuration →
Site URL, so it needs no editing per environment. The apex redirects to `www`
and query strings survive the hop.

## Editing rules

Email clients are not browsers. When changing these files:

- **Inline every style.** Gmail strips most of `<style>`. The `<style>` block is
  progressive enhancement (dark mode, mobile) — the mail must look right without it.
- **Tables for layout.** No flex, no grid, no external CSS or web fonts.
- **Keep the plain-text link.** Corporate filters rewrite or strip buttons.
- **Keep the image `alt` text.** Many clients block images by default; with them
  off, the header must still read "Passerelle TCF Canada".
- **Gradients need a solid fallback.** Outlook (Word rendering engine) ignores
  `linear-gradient`, so every gradient element also carries a `bgcolor`.

## Known trade-offs

- `logo-full.png` is ~690 KB. Clients cache it and Gmail proxies it, so it is
  not a per-send cost, but a purpose-built `logo-email.png` (~30 KB, 264px wide)
  would be leaner. Not done here because the email references a **live** URL —
  a new asset only works after the next deploy, while `logo-full.png` works the
  moment the template is pasted.
- Rounded button corners degrade to square in Outlook for Windows. The
  alternative is a VML block, which is a lot of markup for the gain.
- French only. Supabase sends one template per event with no per-user locale, and
  French is the app's default. An English block can be added underneath if the
  audience needs it.
