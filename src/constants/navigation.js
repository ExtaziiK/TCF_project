// Role lists come from rbac.js rather than being rebuilt here: this file used
// to declare its own role list that omitted OWNER, so an owner saw no
// "Pratique" menu (and no account links on mobile) for pages the guard happily
// let them open. One definition, no drift.
import { AUTHENTICATED, ADMIN_ONLY } from "@/auth/rbac";
import { POSTS } from "@/constants/blog";
import { CONJUGATION_TENSES } from "@/constants/conjugation";
import {
  Home, GraduationCap, ClipboardCheck, Sparkles, BookOpen, SpellCheck,
  Languages, PenLine, CreditCard, Calculator, LayoutDashboard, User, Shield, Mail,
} from "lucide-react";

// Single source of truth for the navigation. Each entry may carry a `roles`
// array; entries without one are visible to everyone (including visitors).
// Visibility is resolved by navLinksForRole() — no component should filter
// the menu on its own. Note this only controls what the menu *shows*;
// actual access is enforced by the route guard (src/auth/rbac.js). When an
// entry DOES carry `roles`, keep it identical to that route's PAGE_ACCESS list
// (reuse the same imported constant) — a narrower one hides a page the user can
// actually open, which is how OWNER lost "Pratique". Leaving `roles` off a
// restricted route is the deliberate opposite: "TCF blanc" and "Épreuves"
// stay visible to everyone so the guard can pitch register/upgrade instead.
//
// `icon` and `group` are read only by the mobile drawer (see MOBILE_GROUPS and
// mobileNavForRole below); the desktop bar ignores both.
export const NAV_LINKS = [
  { l: "Accueil", r: "home", icon: Home, group: "start" },
  // The four TCF épreuves live on one page (CO · CE · EO · EE), switched via
  // tabs. Free users see it too, with every quiz locked except the first of
  // each épreuve — the lock is enforced inside the page (BankExplorer).
  { l: "Épreuves", r: "exams", icon: GraduationCap, group: "prep" },
  // Mock exams get their own top-level entry, next to "Épreuves".
  { l: "TCF blanc", r: "mocks", grad: true, icon: ClipboardCheck, group: "prep" },
  // Trending monthly EE/EO subjects to prepare — highlighted like "TCF blanc",
  // but signed-in only (free or paid), so it's hidden from visitors (roles must
  // match sujets-actualite's PAGE_ACCESS list in rbac.js).
  { l: "Sujets EE/EO", r: "sujets-actualite", grad: true, roles: AUTHENTICATED, icon: Sparkles, group: "prep" },
  // Supplementary practice, distinct from the exam épreuves. Ordered from the
  // building blocks up to the exercise that uses them: vocabulary and grammar
  // are things you study, the dictée is where they are tested together.
  //
  // Gated as a whole, unlike "TCF blanc" and "Épreuves": for a visitor both
  // study entries were filtered out and the menu opened onto the single
  // remaining item, which reads as a broken dropdown rather than as an offer.
  // Visitors are pitched by the home page and the route guard instead.
  { l: "Pratique", roles: AUTHENTICATED, menu: [
    { l: "Vocabulaire", r: "vocabulary", roles: AUTHENTICATED, icon: BookOpen, group: "train" },
    { l: "Grammaire", r: "grammar", roles: AUTHENTICATED, icon: SpellCheck, group: "train" },
    { l: "Conjugaison", r: "conjugation", roles: AUTHENTICATED, icon: Languages, group: "train" },
    // NO `roles`, deliberately, and not an oversight: la dictée is Premium
    // (rbac.js → dictee: PREMIUM) but stays visible to free accounts, who land
    // on its sales page instead of the exercise. Hiding it would mean nobody
    // who has not already paid ever learns it exists. Visitors no longer reach
    // it here — the parent menu is signed-in only — but the route itself stays
    // public, so a shared /dictee link still opens the pitch.
    { l: "La dictée", r: "dictee", grad: true, icon: PenLine, group: "train" },
  ] },
  { l: "Tarifs", r: "pricing", icon: CreditCard, group: "tools" },
  { l: "Calculateur", r: "calculator", icon: Calculator, group: "tools" },
];

// Extra entries that only exist in the mobile menu for signed-in users.
// All three sit in the top group, above the study sections and under no
// heading: they are the "where am I / who am I" block, the part of the drawer
// someone reaches for between sessions rather than while revising. A separate
// "Mon compte" section at the bottom put them the furthest possible scroll
// from the identity card that introduces them.
export const ACCOUNT_LINKS = [
  { l: "Tableau de bord", r: "dashboard", roles: AUTHENTICATED, icon: LayoutDashboard, group: "start" },
  { l: "Mon profil", r: "profile", roles: AUTHENTICATED, icon: User, group: "start" },
  { l: "Administration", r: "admin", roles: ADMIN_ONLY, icon: Shield, group: "start" },
];

// Reachable from the footer on every screen, so it only needs adding here.
const MOBILE_ONLY_LINKS = [
  { l: "Contact", r: "contact", icon: Mail, group: "tools" },
];

// The drawer's sections, in render order. Why they exist: the flat list this
// replaced was fourteen identical rows in one column, because navLinksForRole()
// flattens "Pratique" into its four routes and the account links were appended
// raw — so "Vocabulaire" carried exactly as much visual weight as
// "Administration", and nothing said the two belonged to different parts of the
// site. A phone has no hover, so the drawer cannot borrow the desktop bar's
// dropdown to express that hierarchy; it has to be spelled out.
//
// `l: null` means the section renders with no heading — the first group is
// where you land and who you are, and a label over links that obvious is noise.
export const MOBILE_GROUPS = [
  { id: "start", l: null },
  { id: "prep", l: "Préparer l'examen" },
  { id: "train", l: "S'entraîner" },
  { id: "tools", l: "Outils & tarifs" },
];

const visible = (item, role) => !item.roles || item.roles.includes(role);

// Returns the nav tree filtered for a role. Menus keep only the entries the
// role may see; a menu with no visible entries is dropped entirely.
export function navLinksForRole(links, role) {
  return links
    .filter((n) => visible(n, role))
    .map((n) => (n.menu ? { ...n, menu: n.menu.filter((m) => visible(m, role)) } : n))
    .filter((n) => !n.menu || n.menu.length > 0);
}

const GROUP_IDS = new Set(MOBILE_GROUPS.map((g) => g.id));

// The mobile drawer's links, grouped and filtered for a role. Sections that end
// up empty are dropped, so a visitor never sees a heading with nothing under it
// ("S'entraîner" is signed-in only, and would otherwise sit there bare).
//
// Role filtering stays entirely in navLinksForRole() — this function only
// arranges what that one already decided is visible, so the two can't disagree
// about who sees what. An entry whose `group` is missing or misspelt falls into
// "tools" instead of vanishing: a typo should cost a link its placement, never
// its existence.
export function mobileNavForRole(role) {
  const flat = [
    ...navLinksForRole(NAV_LINKS, role).flatMap((n) => (n.menu ? n.menu : [n])),
    ...navLinksForRole(ACCOUNT_LINKS, role),
    ...MOBILE_ONLY_LINKS,
  ];
  const bucket = (item) => (GROUP_IDS.has(item.group) ? item.group : "tools");
  return MOBILE_GROUPS
    .map((g) => ({ ...g, items: flat.filter((item) => bucket(item) === g.id) }))
    .filter((g) => g.items.length > 0);
}

export const SEARCH_INDEX = [
  { l: "Tableau de bord", r: "dashboard", c: "Page" },
  { l: "Compréhension orale", r: "listening", c: "Module" },
  { l: "Compréhension écrite", r: "reading", c: "Module" },
  { l: "Expression écrite", r: "writing", c: "Module" },
  { l: "Expression orale", r: "speaking", c: "Module" },
  { l: "La dictée · écrire ce qu'on entend", r: "dictee", c: "Module" },
  { l: "Vocabulaire · cartes mémoire", r: "vocabulary", c: "Module" },
  { l: "Grammaire · le subjonctif", r: "grammar", c: "Leçon" },
  { l: "Grammaire · les articles", r: "grammar", c: "Leçon" },
  // Generated from the bank rather than hand-listed, so a tense added to
  // src/constants/conjugation/ is searchable the day it lands.
  ...CONJUGATION_TENSES.map((tp) => ({ l: `Conjugaison · ${tp.t.toLowerCase()}`, r: "conjugation", c: "Leçon" })),
  { l: "TCF blancs TCF Canada", r: "mocks", c: "Examens" },
  { l: "Sujets EE/EO du mois", r: "sujets-actualite", c: "Ressources" },
  { l: "Anciens sujets · Expression écrite", r: "sujets-ee", c: "Ressources" },
  { l: "Anciens sujets · Expression orale", r: "sujets-eo", c: "Ressources" },
  { l: "Calculateur TCF → NCLC", r: "calculator", c: "Ressources" },
  { l: "Tarifs et abonnements", r: "pricing", c: "Page" },
  { l: "Avis des candidats", r: "avis", c: "Page" },
  { l: "Foire aux questions", r: "faq", c: "Page" },
  // Every article, generated rather than listed: the search box used to carry
  // one hand-written blog entry pointing at the index, so searching for an
  // article's subject found nothing and searching its title landed on a list.
  ...POSTS.map((p) => ({ l: p.t, r: `blog/${p.slug}`, c: "Blog" })),
];
