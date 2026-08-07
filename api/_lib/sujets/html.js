import { HttpError } from "../groq.js";

// Fetching and text utilities shared by the subject-source adapters
// (api/_lib/sujets/*.js). Nothing site-specific lives here.

const FETCH_TIMEOUT_MS = 15000;
// A plain browser UA: the sources sit behind CDNs that answer 403 to obvious
// scripted agents, and this reads a couple of public pages a month.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchPage(url) {
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new HttpError(504, `La source n'a pas répondu (${url}).`);
  }
  if (!res.ok) throw new HttpError(502, `La source a répondu ${res.status} (${url}).`);
  return res.text();
}

// French typography keeps a space before ? ! : ; and inside quotes, so only the
// period and comma are tightened — the sources often trail "(…, etc.) .".
export const tidy = (s) => String(s).replace(/\s+/g, " ").replace(/\s+([.,])/g, "$1").trim();

export const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
// Unaccented forms, for reading a month out of a URL slug or a heading.
export const MONTH_SLUGS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

export const deaccent = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Whether every letter of `short` appears in `full`, in order. Lets a month
// survive a source dropping accented letters outright — "aot" for "aout",
// "fvrier" for "fevrier" — without matching unrelated months.
function isSubsequence(short, full) {
  let i = 0;
  for (const ch of full) if (ch === short[i]) i++;
  return i === short.length;
}

// "Août 2026" → { year: 2026, monthNum: 8 }. Accents are stripped first, so a
// well-formed label matches outright; the subsequence pass is the fallback for
// the mangled forms ("Aot 2026").
export function parseMonthLabel(label) {
  const flat = deaccent(label);
  const year = Number(flat.match(/\b(20\d\d)\b/)?.[1]);
  if (!year) return null;
  const found = (i) => ({ year, monthNum: i + 1, month: MONTH_LABELS[i] });

  const exact = MONTH_SLUGS.findIndex((slug) => flat.includes(slug));
  if (exact >= 0) return found(exact);

  const word = flat.replace(/[^a-z]/g, "");
  if (word.length < 3) return null;
  const loose = MONTH_SLUGS.map((slug, i) => (isSubsequence(word, slug) ? i : -1)).filter((i) => i >= 0);
  return loose.length === 1 ? found(loose[0]) : null; // ambiguous is worse than unknown
}

const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", times: "×",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»", eacute: "é",
  egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ucirc: "û", icirc: "î",
};

export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

const BLOCK_TAGS = "p|div|section|article|header|footer|nav|aside|main|h[1-6]|ul|ol|li|table|tr|td|th|blockquote|figure|figcaption|br|hr";

// Flattens a page to the visible lines, in reading order. Block elements are
// line breaks; inline elements vanish WITHOUT leaving a space, because a source
// styles words mid-sentence ("J'ai mis cer<span …>tains objets") and a space
// there would split the word. `<article>` is preferred when present — it
// excludes the header, sidebar and footer chrome.
export function toLines(html) {
  let h = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const article = h.match(/<article[\s\S]*?<\/article>/i);
  if (article) h = article[0];
  return decodeEntities(
    h
      .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS})(?:\\s[^>]*)?\\/?>`, "gi"), "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => tidy(l))
    .filter(Boolean);
}
