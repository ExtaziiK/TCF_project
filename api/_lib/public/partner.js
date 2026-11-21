import { createClient } from "@supabase/supabase-js";
import { requireUser } from "../auth.js";
import { enforceRateLimit } from "../ratelimit.js";
import { sendMail, mailConfigured, TEAM_ADDRESS } from "../mailer.js";
import { escapeHtml } from "../emailLayout.js";
import { normalizeWhatsApp } from "../phone.js";

// POST /api/public/partner — the « Devenir partenaire » form (src/pages/
// Partenaires.jsx): a school or training centre, a content creator, or anyone
// else who wants to work with Passerelle.
//
// Same two-way delivery as the support form (./support.js), for the same
// reason — an application nobody is told about waits forever:
//   - a row in partner_applications, worked through in Administration →
//     Partenaires (status, private notes);
//   - an email to the team mailbox, Reply-To the applicant, with a one-tap
//     WhatsApp link when the number can be made international.
// Either one alone is enough to answer "ok".
//
// Open to visitors (no account needed to apply), so it is rate-limited per IP
// and carries a honeypot field: a filled `website` is a bot, answered "ok" and
// dropped, so the bot learns nothing.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const KIND_LABELS = { school: "École / centre de langues", creator: "Créateur de contenu", other: "Autre partenariat" };
export const TESTS = ["TCF Canada", "TCF tout public", "TCF Québec", "TEF", "DELF / DALF"];
const LINK_KEYS = ["instagram", "youtube", "tiktok", "other"];

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const orNull = (v) => (v ? v : null);

// The application, cleaned: every field clipped to the column's limit, only
// the fields of its kind kept. Returns { row } or { error } (French, shown as is).
export function cleanApplication(b = {}) {
  const kind = Object.hasOwn(KIND_LABELS, b.kind) ? b.kind : null;
  if (!kind) return { error: "Choisissez le type de partenariat." };
  const name = clip(b.name, 120);
  const email = clip(b.email, 200);
  const country = clip(b.country, 60);
  const phone = normalizeWhatsApp(b.phone, country);
  if (!name) return { error: "Indiquez votre nom." };
  if (!/.+@.+\..+/.test(email)) return { error: "Entrez une adresse courriel valide." };
  if (phone.typed && !phone.ok) return { error: "Entrez un numéro WhatsApp valide, avec l'indicatif du pays (par exemple +213 5XX XX XX XX)." };

  const row = {
    kind, name, email,
    phone: orNull(phone.e164 || phone.typed),
    country: orNull(country),
    city: orNull(clip(b.city, 80)),
    message: orNull(clip(b.message, 3000)),
    lang: b.lang === "en" ? "en" : "fr",
  };

  if (kind === "school") {
    row.organisation = clip(b.organisation, 160);
    row.role = orNull(clip(b.role, 120));
    row.students_per_year = orNull(clip(b.studentsPerYear, 40));
    row.tests = (Array.isArray(b.tests) ? b.tests : []).filter((x) => TESTS.includes(x));
    row.current_prep = orNull(clip(b.currentPrep, 1000));
    if (!row.organisation) return { error: "Indiquez le nom de l'établissement." };
    // A school is called back: the meeting is the point of the form.
    if (!phone.typed) return { error: "Indiquez un numéro WhatsApp pour que nous puissions vous rappeler." };
  }

  if (kind === "creator") {
    const raw = typeof b.links === "object" && b.links ? b.links : {};
    row.links = Object.fromEntries(LINK_KEYS.map((k) => [k, clip(raw[k], 300)]).filter(([, v]) => v));
    row.audience_size = orNull(clip(b.audienceSize, 40));
    row.audience_country = orNull(clip(b.audienceCountry, 120));
    row.topics = orNull(clip(b.topics, 300));
    if (!Object.keys(row.links).length) return { error: "Ajoutez au moins un lien vers votre chaîne ou votre compte." };
  }

  if (kind === "other") {
    row.organisation = orNull(clip(b.organisation, 160));
    if (!row.message) return { error: "Décrivez en quelques mots ce que vous proposez." };
  }

  return { row, waLink: phone.waLink };
}

// The application as label/value lines, for the email.
export function applicationLines(row) {
  const links = Object.entries(row.links || {}).map(([k, v]) => `${k} : ${v}`).join("\n");
  return [
    ["Type", KIND_LABELS[row.kind]],
    ["Établissement", row.organisation],
    ["Fonction", row.role],
    ["WhatsApp", row.phone],
    ["Pays", [row.city, row.country].filter(Boolean).join(", ")],
    ["Élèves par an", row.students_per_year],
    ["Examens préparés", (row.tests || []).join(", ")],
    ["Préparation actuelle", row.current_prep],
    ["Liens", links],
    ["Audience", row.audience_size],
    ["Pays de l'audience", row.audience_country],
    ["Sujets", row.topics],
    ["Langue du formulaire", row.lang === "en" ? "anglais" : null],
  ].filter(([, v]) => v);
}

export default async function partner(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    let user = null;
    if (req.headers.authorization) user = await requireUser(req).catch(() => null);
    const b = req.body || {};
    if (clip(b.website, 200)) return res.status(200).json({ ok: true }); // honeypot
    await enforceRateLimit(req, { name: "partner", limit: 3, windowSeconds: 3600, userId: user?.id });

    const { row, waLink, error } = cleanApplication(b);
    if (error) return res.status(400).json({ error });
    row.user_id = user?.id || null;

    const { error: rowError } = await admin.from("partner_applications").insert(row);
    if (rowError) console.warn("partner: partner_applications:", rowError.message);

    let emailed = false;
    if (mailConfigured() && TEAM_ADDRESS) {
      const title = `Demande de partenariat — ${KIND_LABELS[row.kind]}`;
      const rows = applicationLines(row).map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#0f172a;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join("");
      const wa = waLink
        ? `<p style="margin:20px 0"><a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Écrire sur WhatsApp</a></p>`
        : "";
      const html = `<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:560px">
<p style="margin:0 0 4px;font-size:18px;font-weight:700">${escapeHtml(title)}</p>
<p style="margin:0 0 16px;color:#475569">${escapeHtml(row.name)} · ${escapeHtml(row.email)}</p>
${row.message ? `<p style="margin:0 0 16px;white-space:pre-wrap;border-left:3px solid #2E6BE6;padding-left:12px">${escapeHtml(row.message)}</p>` : ""}
${wa}
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
<p style="margin:20px 0 0;color:#64748b;font-size:13px">Répondre à ce courriel écrit directement au demandeur. La demande est aussi dans Administration → Partenaires.</p>
</div>`;
      try {
        await sendMail({ to: TEAM_ADDRESS, replyTo: `"${row.name.replace(/"/g, "")}" <${row.email}>`, subject: `${title} — ${row.organisation || row.name}`, html });
        emailed = true;
      } catch (err) {
        console.warn("partner: email:", err.message);
      }
    }

    if (rowError && !emailed) return res.status(503).json({ error: "L'envoi a échoué. Réessayez dans un instant." });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "L'envoi a échoué." });
  }
}
