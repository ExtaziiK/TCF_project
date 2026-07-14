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
      "Forfait Découverte gratuit ou Premium mensuel et annuel : questions illimitées, TCF blancs complets et analyse IA. Paiement sécurisé en dollars canadiens via Stripe.",
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
    title: "Blogue — conseils TCF Canada et immigration",
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
  register: {
    path: "/inscription",
    title: "Créer un compte gratuit",
    description:
      "Créez votre compte gratuit en 30 secondes : un quiz complet offert dans chaque épreuve du TCF Canada, corrections détaillées et suivi de progression.",
  },

  // ── Gated routes: reachable URLs, but noindex (crawlers only see a gate) ──
  login: { path: "/connexion", title: "Connexion", noindex: true },
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
};

const PATH_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_META).map(([route, m]) => [m.path, route]));

export function pathForRoute(route) {
  return ROUTE_META[route]?.path || "/";
}

// Trailing slashes are tolerated ("/tarifs/" -> pricing); anything unknown
// falls back to home, mirroring the old unknown-route behaviour.
export function routeFromPath(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PATH_TO_ROUTE[clean] || "home";
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
  const url = window.location.origin + meta.path;

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
