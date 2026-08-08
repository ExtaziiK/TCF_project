import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { routeFromPath } from "@/constants/seo";

// Renders an article body (src/constants/posts/*.js).
//
// The posts used to be arrays of bare paragraphs, which is why they read as
// thin: no headings to scan, no lists, no way to point a reader at the page
// that answers the question the paragraph just raised. A block is either a
// plain string (a paragraph) or one of the shapes below:
//
//   { h }                                a section heading (h2, anchored)
//   { ul } / { ol }                      bulleted / numbered list
//   { img: { src, alt, w, h, … } }       a figure
//   { note, title }                      a highlighted aside
//   { table: { cols, rows }, caption }   a small data table
//   { cta: { r, label, text } }          an internal call to action
//
// Every text field goes through the inline parser below, so any of them can
// carry links. Data stays in src/constants — this file only decides how it
// looks.

/* ------------------------------- inline text ------------------------------ */

// Two constructs only: **gras** and [libellé](cible). The articles are data,
// not a CMS; anything that needs more structure is a block instead.
const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

const LINK_CLS = "font-semibold text-blue-600 hover:underline underline-offset-2 decoration-2";

function Link({ href, children }) {
  // Outbound references (IRCC, France Éducation international…) open in a new
  // tab so a reader following a source doesn't lose the article.
  if (/^https?:/i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>{children}</a>;
  }
  const route = routeFromPath(href);
  // An internal href matching no route would silently link to the 404 page.
  // Render the label as plain text instead; `npm run check:seo` fails on the
  // same condition, so a typo is caught before it ships rather than after.
  if (route === "notfound") return <>{children}</>;
  return <RouteLink r={route} className={LINK_CLS}>{children}</RouteLink>;
}

// Translated first, then parsed: the EN dictionary is keyed by the exact French
// source string, markup included, and falls back to French when absent.
export function Inline({ text }) {
  const { t } = useApp();
  const src = t(text);
  const out = [];
  let last = 0;
  for (const m of src.matchAll(INLINE_RE)) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[3]) out.push(<strong key={m.index} className="font-semibold">{m[3]}</strong>);
    else out.push(<Link key={m.index} href={m[2]}>{m[1]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return <>{out}</>;
}

/* --------------------------------- anchors -------------------------------- */

// Anchor for a section heading, derived from the FRENCH source text so a
// shared #link keeps working when the reader flips the UI to English.
export const headingId = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, ""); // after the slice, so a cut mid-word leaves no trailing dash

/* --------------------------------- figures -------------------------------- */

// `eager` is for the article's lead image only: it is the largest thing above
// the fold, so it should not wait for the lazy-loading heuristic.
export function Figure({ src, alt, w, h, caption, credit, creditUrl, eager, className = "" }) {
  const { c, t } = useApp();
  return (
    <figure className={className}>
      {/* width/height are the file's real pixel size: the browser reserves the
          right box before the bytes arrive, so nothing jumps as it loads. */}
      <img
        src={src} alt={t(alt)} width={w} height={h}
        loading={eager ? "eager" : "lazy"} decoding="async"
        className={`w-full h-auto rounded-3xl border ${c.border} ${c.track}`}
      />
      {(caption || credit) && (
        <figcaption className={`mt-2.5 text-xs leading-relaxed ${c.faint}`}>
          {caption && <span>{t(caption)}</span>}
          {caption && credit && " · "}
          {credit && (creditUrl
            ? <a href={creditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{credit}</a>
            : <span>{credit}</span>)}
        </figcaption>
      )}
    </figure>
  );
}

/* --------------------------------- blocks --------------------------------- */

function Bullets({ items, ordered }) {
  const { c } = useApp();
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={`shrink-0 rounded-full flex items-center justify-center font-bold text-blue-600 ${ordered
              ? "w-6 h-6 mt-0.5 bg-blue-600/10 text-xs"
              : "w-1.5 h-1.5 mt-[0.62rem] bg-blue-600"}`}
            aria-hidden="true"
          >
            {ordered ? i + 1 : ""}
          </span>
          <span className={`leading-relaxed ${c.sub}`}><Inline text={item} /></span>
        </li>
      ))}
    </ul>
  );
}

// Not a Card: Card paints the page's card background, and layering the tint on
// top of it depends on class order in the generated CSS rather than on the
// order they're written here. Plain div, one background.
function Note({ title, text }) {
  const { c, t } = useApp();
  return (
    <div className="rounded-3xl border border-blue-600/25 bg-blue-600/[0.06] p-5">
      {title && <p className={`font-display font-bold mb-1.5 ${c.text}`}>{t(title)}</p>}
      <p className={`text-sm leading-relaxed ${c.sub}`}><Inline text={text} /></p>
    </div>
  );
}

function DataTable({ cols, rows, caption }) {
  const { c, t } = useApp();
  return (
    <figure>
      {/* Wide tables scroll inside their own box rather than widening the page. */}
      <div className={`overflow-x-auto rounded-2xl border ${c.border}`}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-600/[0.06]">
              {cols.map((col) => (
                <th key={col} className={`text-left font-semibold px-4 py-2.5 whitespace-nowrap ${c.text}`}>{t(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-t ${c.border}`}>
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 whitespace-nowrap ${j === 0 ? `font-semibold ${c.text}` : c.sub}`}>{t(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className={`mt-2.5 text-xs ${c.faint}`}>{t(caption)}</figcaption>}
    </figure>
  );
}

function Cta({ r, label, text }) {
  const { c, t, nav } = useApp();
  return (
    <Card className="p-6 border-blue-600/30">
      <p className={`leading-relaxed ${c.sub}`}><Inline text={text} /></p>
      <Btn className="mt-4" onClick={() => nav(r)}>{t(label)}</Btn>
    </Card>
  );
}

function Block({ b }) {
  const { c } = useApp();
  if (typeof b === "string") return <p className={`leading-[1.8] ${c.sub}`}><Inline text={b} /></p>;
  // `scroll-mt` keeps a heading clear of the fixed header when the table of
  // contents jumps to it.
  if (b.h) return <h2 id={headingId(b.h)} className={`font-display font-bold text-2xl md:text-[26px] leading-snug pt-4 scroll-mt-28 ${c.text}`}><Inline text={b.h} /></h2>;
  if (b.ul) return <Bullets items={b.ul} />;
  if (b.ol) return <Bullets items={b.ol} ordered />;
  if (b.img) return <Figure {...b.img} />;
  if (b.note) return <Note title={b.title} text={b.note} />;
  if (b.table) return <DataTable cols={b.table.cols} rows={b.table.rows} caption={b.caption} />;
  if (b.cta) return <Cta {...b.cta} />;
  return null;
}

export function ArticleBody({ blocks }) {
  return (
    <div className="max-w-2xl space-y-6">
      {blocks.map((b, i) => <Block key={i} b={b} />)}
    </div>
  );
}
