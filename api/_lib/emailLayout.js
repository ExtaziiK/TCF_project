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
// as "tarifs" mapped to a URL); an unknown target stays as plain text.
export function paragraphs(s, { last = "20px", links = {} } = {}) {
  const blocks = String(s).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return blocks.map((p, i) => {
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
