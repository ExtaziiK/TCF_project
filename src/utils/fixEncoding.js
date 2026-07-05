// Repairs double-encoded French text at runtime (UTF-8 read as latin1, with
// the C1 control codepoints U+0080-U+009F dropped). Question-bank exports
// arrive with this corruption, so every string loaded from src/bank/ goes
// through here -- dropping raw export files in the folder "just works".
//
// All non-ASCII characters are \u escapes (several are invisible C1
// controls that would not survive copy/paste). Legend, in mojibake space:
//   \u00e2 renders as a-circumflex  (first byte of E2-family punctuation)
//   \u00c3 renders as capital A-tilde (first byte of C3-family letters)
const MARKERS = /[\u00c3\u00c2\u00e2\u00f0]/;

export function fixEncoding(s) {
  if (typeof s !== "string" || !MARKERS.test(s)) return s;
  // Ellipsis: a-circumflex + broken bar (its middle 0x80 byte was dropped)
  let r = s.split("\u00e2\u00a6").join("\u00e2\u0080\u00a6");
  // lone a-circumflex glued to a letter (or accented pair) was an apostrophe
  r = r.replace(/\u00e2(?=[A-Za-z\u00c3])/g, "\u00e2\u0080\u0099");
  // lone a-circumflex between spaces was an em dash
  r = r.replace(/ \u00e2 /g, " \u00e2\u0080\u0094 ");
  // lone a-circumflex before a digit was a minus
  r = r.replace(/\u00e2(?=\d)/g, "\u00e2\u0088\u0092");
  // A-tilde + two spaces -> a-grave + space (the NBSP byte became a space)
  r = r.replace(/\u00c3 {2}/g, "\u00c3\u00a0 ");
  // A-tilde + one space + punctuation -> a-grave glued to punctuation
  r = r.replace(/\u00c3 (?=[.,!?;:'")\-\u00c2])/g, "\u00c3\u00a0");
  // A-tilde + one space + letter -> capital A-grave + space (sentence-initial)
  r = r.replace(/\u00c3 (?=[A-Za-z])/g, "\u00c3\u0080 ");
  // A-tilde glued to an ASCII letter -> capital E-acute
  r = r.replace(/\u00c3(?=[A-Za-z])/g, "\u00c3\u0089");
  // Roundtrip: one byte per codepoint, then decode as UTF-8.
  const codes = [];
  for (const ch of r) codes.push(ch.codePointAt(0));
  if (codes.some((c) => c > 0xff)) return s; // mixed/already-clean content: leave as-is
  const decoded = new TextDecoder("utf-8").decode(new Uint8Array(codes));
  // If anything failed to decode, prefer the original over showing U+FFFD.
  return decoded.includes("\ufffd") ? s : decoded;
}

// Recursively fixes every string in a JSON structure.
export function fixEncodingDeep(value) {
  if (typeof value === "string") return fixEncoding(value);
  if (Array.isArray(value)) return value.map(fixEncodingDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fixEncodingDeep(v)]));
  }
  return value;
}
