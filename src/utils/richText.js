import DOMPurify from "dompurify";

// Sanitizer for the admin-authored home banner. The banner is rendered to every
// visitor via dangerouslySetInnerHTML, so its HTML must be trusted. Two layers,
// OWASP defence-in-depth:
//   1. A strict whitelist walk (DOMParser, below) that keeps only a few inline
//      formatting tags, turns block wrappers (<div>/<p>) into line breaks, and
//      allows links only for http(s)/mailto — dropping scripts, styles, event
//      handlers, and every unknown tag/attribute.
//   2. DOMPurify as the battle-tested final gate over the walker's output.
// Runs in the browser (uses DOMParser / DOMPurify); a non-DOM environment
// (SSR / tests) degrades to plain, fully-escaped text.

const INLINE = { B: "strong", STRONG: "strong", I: "em", EM: "em", U: "u" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

// Only http(s) and mailto links are allowed — an allowlist blocks javascript:,
// data:, vbscript:, etc. Exported so a test can tripwire the scheme rule.
export const isSafeUrl = (href) => /^(https?:|mailto:)/i.test(String(href || "").trim());

// The two inline tags + attributes the banner may contain after sanitizing.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["strong", "em", "u", "br", "a"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

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
      if (isSafeUrl(href)) out += `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${walk(n)}</a>`;
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
  const walked = walk(doc.body.firstChild).replace(/^(?:<br>)+|(?:<br>)+$/g, "").trim();
  // Final gate: DOMPurify (falls through to the already-sanitized walk output if
  // DOMPurify isn't usable, e.g. no window in a non-browser environment).
  return typeof DOMPurify?.sanitize === "function" ? DOMPurify.sanitize(walked, PURIFY_CONFIG) : walked;
}

// True when the (sanitized) content has any visible text.
export function richTextHasContent(html) {
  return sanitizeRichText(html).replace(/<[^>]+>/g, "").trim().length > 0;
}
