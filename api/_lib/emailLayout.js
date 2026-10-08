// The look shared by every email the site sends: the one the team uses when
// writing by hand from the Hostinger webmail (emails/*.html at the repo root) —
// white card, centred logo, a signature with the logo mark. Tables and inline
// styles only, so Gmail and Outlook keep it.
//
// Pure (no Node or browser APIs): the server sends with it and the admin
// "Emails" tab previews with it, so a preview is exactly what goes out.

export const FONT = "Segoe UI,Roboto,Helvetica,Arial,sans-serif";

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Plain text → inline HTML. Escapes everything, then: **bold**, single
// newlines kept, and French typography (no break before ? ! : ; » %).
export const inline = (s) => escapeHtml(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/ ([?!:;»%])/g, "&nbsp;$1")
  .replace(/« /g, "«&nbsp;")
  .replace(/\n/g, "<br>");

export const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${inline(label)}</a>`;

// Blank-line-separated paragraphs. A paragraph that is only `[Label](target)`
// becomes a centred button, when `links` knows the target (a short name such
// as "tarifs" mapped to a URL); an unknown target stays as plain text. A
// paragraph that is exactly a key of `custom` (e.g. "{encadre}") is replaced
// by that ready-made HTML.
export function paragraphs(s, { last = "20px", links = {}, custom = {} } = {}) {
  const blocks = String(s).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return blocks.map((p, i) => {
    if (custom[p] !== undefined) return custom[p];
    const margin = i === blocks.length - 1 ? last : "14px";
    const btn = p.match(/^\[([^\]]+)\]\(\s*([a-z-]+)\s*\)$/i);
    if (btn && links[btn[2].toLowerCase()]) {
      return `<p style="margin:0 0 ${i === blocks.length - 1 ? last : "22px"} 0;text-align:center;">${button(links[btn[2].toLowerCase()], btn[1])}</p>`;
    }
    return `<p style="margin:0 0 ${margin} 0;">${inline(p)}</p>`;
  }).join("");
}

export const greetingLine = (firstName) => {
  const first = String(firstName || "").trim();
  return `<p style="margin:0 0 14px 0;">${first ? `Bonjour ${escapeHtml(first)},` : "Bonjour,"}</p>`;
};

// First name from an auth account, as the greeting uses it.
export const firstNameOf = (user) =>
  String(user?.user_metadata?.name || user?.user_metadata?.full_name || "").trim().split(/\s+/)[0] || "";

export function signedLetter(site, inner) {
  return `
<div style="margin:0;padding:24px;background:#e2e8f0;font-family:${FONT};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;">
  <tr><td style="padding:28px 32px 8px 32px;text-align:center;">
    <img src="${site}/logo-full.png" width="110" alt="TCF Passerelle" style="display:inline-block;border:0;height:auto;">
  </td></tr>
  <tr><td style="padding:12px 32px 8px 32px;font-family:${FONT};font-size:15px;line-height:24px;color:#334155;">
    ${inner}
  </td></tr>
  <tr><td style="padding:8px 32px 28px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #2563eb;padding-top:14px;">
      <tr>
        <td style="padding:14px 14px 0 0;vertical-align:middle;">
          <img src="${site}/logo-mark.png" width="44" height="44" alt="TCF Passerelle" style="display:block;border:0;">
        </td>
        <td style="padding:14px 0 0 0;vertical-align:middle;font-family:${FONT};font-size:13px;line-height:20px;color:#64748b;">
          <strong style="font-size:15px;color:#0f172a;">L'équipe TCF Passerelle</strong><br>
          Préparation au TCF Canada<br>
          <a href="mailto:contact@tcfpasserelle.com" style="color:#2563eb;text-decoration:none;">contact@tcfpasserelle.com</a>
          &nbsp;·&nbsp;
          <a href="${site}" style="color:#2563eb;text-decoration:none;">www.tcfpasserelle.com</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</div>`;
}

/* ------------------------------- promo code box ---------------------------- */

// Animations of a code being typed and applied on the Tarifs page, by code.
// Shown in emails and on /code-promo only for the code they show, so changing
// the promo code never pairs it with a GIF of another one. A new code gets its
// GIF the way promo-tcf30.gif was made (modeled on ads/capture-promo-dz.mjs).
export const PROMO_GIFS = {
  TCF30: { src: "/promo-tcf30.gif", width: 400, height: 193 },
  TCF50: { src: "/promo-tcf50.gif", width: 400, height: 229 }, // the 2026-09 campaign's
};

// The page that walks through using a code (src/pages/CodePromo.jsx).
export const promoHelpUrl = (site, code) => `${site}/code-promo?code=${encodeURIComponent(code)}`;

// The dashed box: the code, its GIF and the "how to" link. "" without a code.
export function promoBox(site, code, text) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "";
  const gif = PROMO_GIFS[c];
  const help = promoHelpUrl(site, c);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;">
      <tr><td style="padding:16px 18px;text-align:center;font-family:${FONT};font-size:15px;line-height:24px;color:#334155;">
        ${String(text || "").trim() ? `${inline(String(text).trim())}<br>` : ""}
        <span style="display:inline-block;margin:8px 0 6px 0;padding:6px 16px;background:#ffffff;border-radius:8px;font-size:22px;font-weight:800;letter-spacing:2px;color:#1d4ed8;">${escapeHtml(c)}</span><br>
        ${gif ? `<a href="${help}" style="text-decoration:none;"><img src="${site}${gif.src}" width="${gif.width}" height="${gif.height}" alt="Le code ${escapeHtml(c)} tapé dans la page Tarifs, puis appliqué" style="display:block;margin:10px auto 8px auto;border:1px solid #dbe4f5;border-radius:10px;width:100%;max-width:${gif.width}px;height:auto;"></a>` : ""}
        <span style="font-size:13px;color:#64748b;">À saisir dans le champ «&nbsp;Vous avez un code promo&nbsp;?&nbsp;» de la page <a href="${site}/tarifs" style="color:#2563eb;">Tarifs</a>.</span><br>
        <a href="${help}" style="display:inline-block;margin-top:6px;font-size:14px;font-weight:600;color:#2563eb;text-decoration:none;">Comment utiliser le code&nbsp;? Voir les étapes&nbsp;→</a>
      </td></tr>
    </table>`;
}

/* ------------------------------ TCF blanc results -------------------------- */

// The results card of the "Vos résultats du TCF blanc" email, from
// summarizeScore() (api/_lib/mockResults.js).
export function resultsBox(summary) {
  const nclcText = (n) => (n == null ? "" : n === 0 ? "sous NCLC 4" : `NCLC ${n}`);
  const rows = summary.sections.map((x) => `
      <tr>
        <td style="padding:9px 0;border-top:1px solid #e2e8f0;font-family:${FONT};font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(x.name)}</td>
        <td align="right" style="padding:9px 0;border-top:1px solid #e2e8f0;font-family:${FONT};font-size:14px;color:#334155;">
          ${x.selfAssessed ? `<span style="color:#64748b;">auto-évaluée</span>` : `${x.ok}&nbsp;/&nbsp;${x.total} · ${x.level}${x.nclc != null ? ` · <strong style="color:#1d4ed8;">${nclcText(x.nclc)}</strong>` : ""}`}
        </td>
      </tr>`).join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
      <tr><td style="padding:18px 20px 6px 20px;text-align:center;font-family:${FONT};">
        <div style="font-size:13px;color:#64748b;">Score estimé</div>
        <div style="font-size:30px;line-height:38px;font-weight:800;color:#1d4ed8;">${summary.points}&nbsp;/&nbsp;699</div>
        <div style="font-size:14px;color:#334155;">Niveau estimé&nbsp;: <strong>${escapeHtml(summary.level)}</strong></div>
      </td></tr>
      <tr><td style="padding:8px 20px 14px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
      </td></tr>
    </table>`;
}

/* ------------------------------ sale countdown ----------------------------- */

// The countdown of a running sale (api/_lib/sale.js): an animated GIF drawn
// by /api/public/countdown at the moment the email is opened, so the time
// left is right whenever it is read. Size from api/_lib/public/countdown.js.
export function countdownBox(site) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
      <tr><td align="center" style="font-family:${FONT};font-size:13px;color:#64748b;padding-bottom:8px;">Fin de la promo dans&nbsp;:</td></tr>
      <tr><td align="center"><img src="${site}/api/public/countdown" width="278" height="64" alt="Compte à rebours jusqu'à la fin de la promo" style="display:block;border:0;width:278px;max-width:100%;height:auto;"></td></tr>
    </table>`;
}
