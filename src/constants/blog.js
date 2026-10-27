// The article index. Each post lives in its own file under ./posts — they run
// well past a thousand words each, and one 4 000-line constants file would be
// unreadable and unmergeable. This module is the only place that knows the
// full list, so publishing an article means adding two lines here. The build
// regenerates src/constants/blogIndex.js (titles and URLs without bodies, for
// every page) and the sitemap from it.
//
// Post shape — see src/components/blog/ArticleBody.jsx for the body blocks:
//   { id, slug, iso, date, cat, t, excerpt, hero, body }
//
// `read` is NOT authored: it is computed from the body below, so it can never
// drift from the article it describes (the old hand-written "7 min" survived
// three rewrites of its own text).

import { post as quEstCe } from "./posts/qu-est-ce-que-le-tcf-canada.js";
import { post as quiDoitPasser } from "./posts/qui-doit-passer-le-tcf-canada.js";
import { post as format } from "./posts/format-tcf-canada.js";
import { post as quatreEpreuves } from "./posts/quatre-epreuves-tcf-canada.js";
import { post as notation } from "./posts/comment-est-note-le-tcf-canada.js";
import { post as quelNiveau } from "./posts/quel-niveau-viser-tcf-canada.js";
import { post as sePreparer } from "./posts/comment-se-preparer-au-tcf-canada.js";
import { post as planEtude } from "./posts/plan-etude-tcf-canada-8-semaines.js";
import { post as tcfOuTef } from "./posts/tcf-canada-ou-tef-canada.js";
import { post as scoreNclc } from "./posts/score-tcf-canada-niveaux-nclc.js";
import { post as expressionEcrite } from "./posts/expression-ecrite-tcf-canada.js";
import { post as changements2026 } from "./posts/tcf-canada-2026-changements.js";
import { post as entreeExpress } from "./posts/entree-express-points-francais.js";
import { post as habitudesC1 } from "./posts/5-habitudes-etude-niveau-c1.js";
import { post as pointQuiManque } from "./posts/expression-ecrite-le-point-qui-manque.js";
import { post as oralTache3 } from "./posts/expression-orale-tache-3-methode.js";
import { post as meilleursSites } from "./posts/meilleurs-sites-tcf-canada.js";
import { post as rdvAlgerie } from "./posts/rendez-vous-tcf-canada-algerie.js";
import { post as rdvMaroc } from "./posts/rendez-vous-tcf-canada-maroc.js";
import { post as rdvTunisie } from "./posts/rendez-vous-tcf-canada-tunisie.js";
import { post as rdvCameroun } from "./posts/rendez-vous-tcf-canada-cameroun.js";

const ALL = [
  quEstCe, quiDoitPasser, format, quatreEpreuves, notation, quelNiveau,
  sePreparer, planEtude, tcfOuTef, scoreNclc, expressionEcrite,
  changements2026, entreeExpress, habitudesC1, pointQuiManque, oralTache3,
  meilleursSites, rdvAlgerie, rdvMaroc, rdvTunisie, rdvCameroun,
];

// Category → Pill tone, so the index and the article header agree on the
// colour without either of them hard-coding a list of categories.
export const CAT_TONE = {
  Immigration: "red",
  "Comprendre le test": "green",
  "Méthode": "blue",
  "Actualités": "amber",
};

/* ---------------------------- reading time ------------------------------- */

// Every readable string in a block, whatever its shape.
function blockText(b) {
  if (typeof b === "string") return b;
  if (!b || typeof b !== "object") return "";
  if (b.ul || b.ol) return (b.ul || b.ol).join(" ");
  if (b.table) return [...b.table.cols, ...b.table.rows.flat()].join(" ");
  if (b.img) return b.img.caption || "";
  if (b.cta) return b.cta.text;
  return [b.h, b.note, b.title, b.caption].filter(Boolean).join(" ");
}

// Link targets and bold markers are markup, not prose: [libellé](/chemin)
// counts as its label alone.
const stripMarkup = (s) => s.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1").replace(/\*\*/g, "");

export function wordCount(post) {
  const text = stripMarkup(post.body.map(blockText).join(" "));
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

// 180 words/minute — slower than the usual 200-250 English figure, because
// most readers here are reading a second language about a test that matters.
const readingTime = (post) => `${Math.max(1, Math.round(wordCount(post) / 180))} min`;

/* -------------------------------- exports -------------------------------- */

// Newest first. The index page and "related articles" both rely on this order,
// and sorting here means a new post lands in the right place from its `iso`
// alone rather than from where it was pasted into the array.
export const POSTS = ALL
  .slice()
  .sort((a, b) => b.iso.localeCompare(a.iso))
  .map((p) => ({ ...p, words: wordCount(p), read: readingTime(p) }));

export const postBySlug = (slug) => POSTS.find((p) => p.slug === slug);

// Up to `n` articles to read next: same category first (closest topic), then
// the most recent of the others, so an article is never a dead end.
export function relatedPosts(post, n = 3) {
  const others = POSTS.filter((p) => p.slug !== post.slug);
  const sameCat = others.filter((p) => p.cat === post.cat);
  const rest = others.filter((p) => p.cat !== post.cat);
  return [...sameCat, ...rest].slice(0, n);
}
