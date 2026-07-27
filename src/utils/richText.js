// Whitelist sanitizer for the admin-authored home banner. The banner is
// rendered to every visitor via dangerouslySetInnerHTML, so we keep only a few
// inline formatting tags and drop everything else (scripts, styles, event
// handlers, unknown tags/attributes). Block wrappers that contentEditable emits
// (<div>/<p>) become line breaks. Runs in the browser (uses DOMParser).

const INLINE = { B: "strong", STRONG: "strong", I: "em", EM: "em", U: "u" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

function walk(node) {
  let out = "";
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += esc(n.nodeValue); return; } // text
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === "BR") { out += "<br>"; return; }
    if (tag === "DIV" || tag === "P") { // block → line break before content
      if (out && !out.endsWith("<br>")) out += "<br>";
      out += walk(n);
      return;
    }
    if (INLINE[tag]) { const t = INLINE[tag]; out += `<${t}>${walk(n)}</${t}>`; return; }
    if (tag === "A") {
      const href = n.getAttribute("href") || "";
      if (/^(https?:|mailto:)/i.test(href)) out += `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${walk(n)}</a>`;
      else out += walk(n);
      return;
    }
    out += walk(n); // unknown tag: keep only its (sanitized) children
  });
  return out;
}

export function sanitizeRichText(html) {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return esc(html); // SSR / no DOM: plain text
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  return walk(doc.body.firstChild).replace(/^(?:<br>)+|(?:<br>)+$/g, "").trim();
}

// True when the (sanitized) content has any visible text.
export function richTextHasContent(html) {
  return sanitizeRichText(html).replace(/<[^>]+>/g, "").trim().length > 0;
}
