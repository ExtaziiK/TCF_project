// SEO routing + metadata. Single source of truth for the URL path, document
// title, meta description and indexability of every route. AppProvider maps
// paths <-> routes with it (real URLs are what make the site crawlable and
// deep-linkable at all — before this, every page lived at "/"), and
// applyRouteMeta() keeps the document head in sync on navigation.
//
// Titles/descriptions stay French regardless of the UI language toggle: the
// site is FR-first and the toggle is a client-side dictionary, not separate
// localized URLs.
//
// `noindex` marks routes whose content sits behind the route guard (a crawler
// only ever sees the register/upgrade gate there — thin, duplicated content
// that would compete with the real landing pages).

import { POSTS } from "@/constants/blog";
import { TERMS_DRAFT } from "@/constants/terms";
import { PRIVACY_DRAFT } from "@/constants/privacy";
import { SOCIAL_URLS, CONTACT_EMAIL } from "@/constants/social";

export const SITE_NAME = "Passerelle TCF Canada";
const DEFAULT_TITLE = "Passerelle · Préparation au TCF Canada";

export const ROUTE_META = {
  home: {
    path: "/",
    title: DEFAULT_TITLE, // brand-first on the homepage; other routes append the brand
    description:
      "Préparez le TCF Canada en ligne : quiz au format officiel des quatre épreuves, TCF blancs chronométrés, analyse IA de l'écrit et de l'oral et suivi de votre niveau CECR.",
  },
  pricing: {
    path: "/tarifs",
    title: "Tarifs et abonnements",
    description:
      "Forfait Sans papier gratuit ou Premium mensuel et annuel : questions illimitées, TCF blancs complets et analyse IA. Paiement sécurisé via Stripe.",
  },
  calculator: {
    path: "/calculateur-tcf-nclc",
    title: "Calculateur TCF Canada → NCLC",
    description:
      "Convertissez gratuitement vos scores TCF Canada en niveaux NCLC (Niveaux de compétence linguistique canadiens) pour Entrée express et vos démarches d'immigration.",
  },
  guide: {
    path: "/guide-tcf-canada",
    title: "Guide de l'examen TCF Canada",
    description:
      "Tout comprendre du TCF Canada : structure des quatre épreuves, durées, barème sur 699, correspondances CECR et NCLC, et conseils concrets de préparation.",
  },
  "guide-co": {
    path: "/guide-tcf-canada/comprehension-orale",
    title: "Compréhension orale — guide TCF Canada",
    description:
      "L'épreuve de compréhension orale du TCF Canada : format, nombre de questions, durée, pièges fréquents et stratégies d'écoute pour viser le meilleur niveau.",
  },
  "guide-ce": {
    path: "/guide-tcf-canada/comprehension-ecrite",
    title: "Compréhension écrite — guide TCF Canada",
    description:
      "L'épreuve de compréhension écrite du TCF Canada : types de textes, gestion du temps, progression de difficulté et méthodes de lecture efficaces.",
  },
  "guide-ee": {
    path: "/guide-tcf-canada/expression-ecrite",
    title: "Expression écrite — guide TCF Canada",
    description:
      "L'épreuve d'expression écrite du TCF Canada : les trois tâches, les attentes des correcteurs, la gestion des mots et des exemples de réponses réussies.",
  },
  "guide-eo": {
    path: "/guide-tcf-canada/expression-orale",
    title: "Expression orale — guide TCF Canada",
    description:
      "L'épreuve d'expression orale du TCF Canada : déroulement des trois tâches, temps de préparation et de parole, et conseils pour s'exprimer avec assurance.",
  },
  blog: {
    path: "/blogue",
    title: "Blog — conseils TCF Canada et immigration",
    description:
      "Conseils de préparation au TCF Canada, stratégies par épreuve et repères pour votre projet d'immigration : Entrée express, NCLC et étude efficace du français.",
  },
  faq: {
    path: "/faq",
    title: "Foire aux questions",
    description:
      "Les réponses aux questions les plus fréquentes sur le TCF Canada et sur Passerelle : épreuves, scores, NCLC, abonnements et fonctionnement de la plateforme.",
  },
  about: {
    path: "/a-propos",
    title: "À propos de Passerelle",
    description:
      "Passerelle est une plateforme indépendante de préparation au TCF Canada, pensée pour les candidates et candidats à l'immigration canadienne.",
  },
  contact: {
    path: "/contact",
    title: "Contact",
    description:
      "Une question sur le TCF Canada ou sur votre abonnement Passerelle ? Écrivez-nous, l'équipe répond rapidement.",
  },
  // Route-guarded (AUTHENTICATED in rbac.js), so a crawler only ever reaches
  // the register gate here — noindex, per the policy at the top of this file.
  // The public archives below (sujets-ee / sujets-eo) carry the same subjects
  // and are the pages that should rank.
  "sujets-actualite": {
    path: "/sujets-actualite",
    title: "Sujets EE/EO du mois — TCF Canada",
    description:
      "Les derniers sujets d'expression écrite et orale qui circulent ce mois-ci au TCF Canada, à préparer en priorité. Choisissez l'épreuve pour découvrir les sujets du mois.",
    noindex: true,
  },
  "sujets-ee": {
    path: "/anciens-sujets-expression-ecrite",
    title: "Anciens sujets d'expression écrite — archive par mois",
    description:
      "L'archive des sujets d'expression écrite du TCF Canada, classés par année et par mois : les combinaisons des trois tâches dans leur formulation réelle, pour vous entraîner.",
  },
  "sujets-eo": {
    path: "/anciens-sujets-expression-orale",
    title: "Anciens sujets d'expression orale — archive par mois",
    description:
      "L'archive des sujets d'expression orale du TCF Canada, classés par année et par mois : les sujets de la Tâche 2 (interaction) et de la Tâche 3 (point de vue), par partie.",
  },
  register: {
    path: "/inscription",
    title: "Créer un compte gratuit",
    description:
      "Créez votre compte gratuit en 30 secondes : un quiz complet offert dans chaque épreuve du TCF Canada, corrections détaillées et suivi de progression.",
  },

  // ── Gated routes: reachable URLs, but noindex (crawlers only see a gate) ──
  login: { path: "/connexion", title: "Connexion", noindex: true },
  // Landing page for the reset email's link. noindex: it is only ever reached
  // with a one-time token in the query string, and has nothing to crawl.
  "reset-password": { path: "/nouveau-mot-de-passe", title: "Nouveau mot de passe", noindex: true },
  "checkout-dz": { path: "/paiement-dz", title: "Paiement en dinar algérien", noindex: true },
  practice: { path: "/pratique", title: "Pratique gratuite", noindex: true },
  exams: { path: "/mes-examens", title: "Mes examens", noindex: true },
  mocks: { path: "/tcf-blanc", title: "TCF blanc — examen complet chronométré", noindex: true },
  listening: { path: "/comprehension-orale", title: "Compréhension orale — entraînement", noindex: true },
  reading: { path: "/comprehension-ecrite", title: "Compréhension écrite — entraînement", noindex: true },
  writing: { path: "/expression-ecrite", title: "Expression écrite — atelier", noindex: true },
  speaking: { path: "/expression-orale", title: "Expression orale — studio", noindex: true },
  vocabulary: { path: "/vocabulaire", title: "Vocabulaire — cartes mémoire", noindex: true },
  grammar: { path: "/grammaire", title: "Grammaire", noindex: true },
  dashboard: { path: "/tableau-de-bord", title: "Tableau de bord", noindex: true },
  profile: { path: "/profil", title: "Mon profil", noindex: true },
  admin: { path: "/administration", title: "Administration", noindex: true },
  bank: { path: "/banque-de-questions", title: "Banque de questions", noindex: true },

  // Public and stable — a visitor accepts these before creating an account, so
  // the text must stay readable at a fixed URL (the signup dialog links out to
  // it, and it is the reference for what a given user agreed to).
  // `noindex` while the wording is a placeholder: a thin, half-written legal
  // page is not something to put in front of a crawler. It clears itself the
  // moment TERMS_DRAFT is set to false — at which point add the path to
  // public/sitemap.xml too.
  terms: {
    path: "/conditions-generales",
    title: "Conditions générales d'utilisation",
    description:
      "Les conditions générales d'utilisation de Passerelle : objet du service, compte, abonnements, contenu et données personnelles.",
    noindex: TERMS_DRAFT,
  },
  privacy: {
    path: "/politique-de-confidentialite",
    title: "Politique de confidentialité",
    description:
      "Quelles données Passerelle collecte, pourquoi, avec quels prestataires elles sont partagées, combien de temps elles sont conservées et comment exercer vos droits.",
    noindex: PRIVACY_DRAFT,
  },
  // Indexable from the start, unlike the two above: it was never a draft, it
  // binds nobody, and a visitor who needs to know whether the site works with
  // their screen reader should be able to find the answer from a search engine
  // rather than only from the footer.
  accessibility: {
    path: "/accessibilite",
    title: "Déclaration d'accessibilité",
    description:
      "Ce que Passerelle a mis en place pour l'accessibilité, les limites connues du site, celles propres aux épreuves du TCF, et comment nous signaler un obstacle.",
  },

  // ── 404 ──────────────────────────────────────────────────────────────────
  // Rendered for any URL matching no route. It deliberately has no path of its
  // own: the requested (wrong) URL stays in the address bar instead of being
  // rewritten to "/", so a broken link is visible to the visitor rather than
  // silently turning into the homepage. The hosting rewrite (vercel.json) sends
  // index.html for every path, so the HTTP status is still 200 — `noindex` plus
  // the "introuvable" copy is what tells a crawler this is an error page and
  // not thin duplicate content.
  notfound: {
    path: null,
    title: "Page introuvable",
    description: "Cette page n'existe pas ou a été déplacée.",
    noindex: true,
  },
};

// Each blog post is its own indexable route (`blog/<slug>` -> `/blogue/<slug>`)
// with the post's title + excerpt as its <title>/description, generated from
// POSTS so publishing an article automatically publishes its page (URL, meta,
// canonical, structured data). The base `blog` route stays the article index.
for (const post of POSTS) {
  ROUTE_META[`blog/${post.slug}`] = { path: `/blogue/${post.slug}`, title: post.t, description: post.excerpt, post };
}

// Pathless routes (the 404) are skipped: there is no URL to map back from.
const PATH_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_META).filter(([, m]) => m.path).map(([route, m]) => [m.path, route]),
);

export function pathForRoute(route) {
  // The 404 has no path of its own (see ROUTE_META.notfound). `null` is the
  // right answer for every caller: history.pushState/replaceState read a null
  // URL as "leave the current one", and <a href={null}> renders no href.
  if (route === "notfound") return null;
  return ROUTE_META[route]?.path || "/";
}

// Trailing slashes are tolerated ("/tarifs/" -> pricing); anything unknown is
// the 404 route, so a wrong URL says so instead of quietly serving the
// homepage (a soft 404: 200 + homepage content at an address that doesn't
// exist, which wastes crawl budget and hides broken links).
export function routeFromPath(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PATH_TO_ROUTE[clean] || "notfound";
}

/* ----------------------------- head management ---------------------------- */

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Syncs title, description, robots, canonical and the OG mirrors with the
// current route. Canonical/og:url are built from the live origin, so they are
// correct on any deployment (preview, production, custom domain) without
// hardcoding a host — Google executes JS and reads these; the static tags in
// index.html only serve non-JS scrapers (social cards).
export function applyRouteMeta(route) {
  const meta = ROUTE_META[route] || ROUTE_META.home;
  const title = route === "home" || !ROUTE_META[route] ? DEFAULT_TITLE : `${meta.title} · ${SITE_NAME}`;
  const description = meta.description || ROUTE_META.home.description;
  // The 404 has no path of its own, so canonical/og:url stay self-referential
  // on whatever URL was requested. Pointing them at "/" would contradict the
  // noindex and invite Google to fold the error page into the homepage.
  const url = window.location.origin + (meta.path || window.location.pathname);

  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", meta.noindex ? "noindex" : "index, follow");
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);

  applyArticleJsonLd(meta);
}

// BlogPosting structured data for an article page; removed on any other route so
// only the current article's markup is present in the head.
function applyArticleJsonLd(meta) {
  const el = document.getElementById("seo-article-jsonld");
  if (!meta?.post) { if (el) el.remove(); return; }
  const { post } = meta;
  const url = window.location.origin + meta.path;
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.t,
    description: post.excerpt,
    inLanguage: "fr-CA",
    datePublished: post.iso,
    dateModified: post.iso,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Passerelle" },
    publisher: { "@type": "Organization", name: "Passerelle", logo: { "@type": "ImageObject", url: `${window.location.origin}/logo-mark.png` } },
  };
  const script = el || document.createElement("script");
  script.type = "application/ld+json";
  script.id = "seo-article-jsonld";
  script.textContent = JSON.stringify(data);
  if (!el) document.head.appendChild(script);
}

// Organization + WebSite structured data, injected once at boot. Built at
// runtime so the URLs always match the serving origin.
export function injectStructuredData() {
  if (document.getElementById("seo-jsonld")) return;
  const origin = window.location.origin;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Passerelle",
        url: `${origin}/`,
        logo: `${origin}/logo-mark.png`,
        email: CONTACT_EMAIL,
        // The official profiles, so Google can tie these accounts to the same
        // entity as the site instead of treating each as an unrelated page.
        sameAs: SOCIAL_URLS,
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${origin}/`,
        inLanguage: "fr-CA",
        description: ROUTE_META.home.description,
      },
    ],
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "seo-jsonld";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
