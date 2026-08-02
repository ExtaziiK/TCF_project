// Role lists come from rbac.js rather than being rebuilt here: this file used
// to declare its own `PREMIUM` that omitted OWNER, so an owner saw no "Pratique"
// menu (and no account links on mobile) for pages the guard happily let them
// open. One definition, no drift.
import { AUTHENTICATED, PREMIUM, ADMIN_ONLY } from "@/auth/rbac";

// Single source of truth for the navigation. Each entry may carry a `roles`
// array; entries without one are visible to everyone (including visitors).
// Visibility is resolved by navLinksForRole() — no component should filter
// the menu on its own. Note this only controls what the menu *shows*;
// actual access is enforced by the route guard (src/auth/rbac.js). When an
// entry DOES carry `roles`, keep it identical to that route's PAGE_ACCESS list
// (reuse the same imported constant) — a narrower one hides a page the user can
// actually open, which is how OWNER lost "Pratique". Leaving `roles` off a
// restricted route is the deliberate opposite: "TCF blanc" and "Mes examens"
// stay visible to everyone so the guard can pitch register/upgrade instead.
export const NAV_LINKS = [
  { l: "Accueil", r: "home" },
  // The four TCF épreuves live on one page (CO · CE · EO · EE), switched via
  // tabs. Free users see it too, with every quiz locked except the first of
  // each épreuve — the lock is enforced inside the page (BankExplorer).
  { l: "Mes examens", r: "exams" },
  // Mock exams get their own top-level entry, next to "Mes examens".
  { l: "TCF blanc", r: "mocks", grad: true },
  // Trending monthly EE/EO subjects to prepare — highlighted like "TCF blanc",
  // but signed-in only (free or paid), so it's hidden from visitors (roles must
  // match sujets-actualite's PAGE_ACCESS list in rbac.js).
  { l: "Sujets EE/EO", r: "sujets-actualite", grad: true, roles: AUTHENTICATED },
  // Supplementary practice, distinct from the exam épreuves.
  { l: "Pratique", menu: [
    { l: "Vocabulaire", r: "vocabulary", roles: PREMIUM },
    { l: "Grammaire", r: "grammar", roles: PREMIUM },
  ] },
  { l: "Tarifs", r: "pricing" },
  { l: "Calculateur", r: "calculator" },
];

// Extra entries that only exist in the mobile menu for signed-in users.
export const ACCOUNT_LINKS = [
  { l: "Tableau de bord", r: "dashboard", roles: AUTHENTICATED },
  { l: "Mon profil", r: "profile", roles: AUTHENTICATED },
  { l: "Administration", r: "admin", roles: ADMIN_ONLY },
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

export const SEARCH_INDEX = [
  { l: "Tableau de bord", r: "dashboard", c: "Page" },
  { l: "Compréhension orale", r: "listening", c: "Module" },
  { l: "Compréhension écrite", r: "reading", c: "Module" },
  { l: "Expression écrite", r: "writing", c: "Module" },
  { l: "Expression orale", r: "speaking", c: "Module" },
  { l: "Vocabulaire · cartes mémoire", r: "vocabulary", c: "Module" },
  { l: "Grammaire · le subjonctif", r: "grammar", c: "Leçon" },
  { l: "Grammaire · les articles", r: "grammar", c: "Leçon" },
  { l: "TCF blancs TCF Canada", r: "mocks", c: "Examens" },
  { l: "Sujets EE/EO du mois", r: "sujets-actualite", c: "Ressources" },
  { l: "Anciens sujets · Expression écrite", r: "sujets-ee", c: "Ressources" },
  { l: "Anciens sujets · Expression orale", r: "sujets-eo", c: "Ressources" },
  { l: "Calculateur TCF → NCLC", r: "calculator", c: "Ressources" },
  { l: "Tarifs et abonnements", r: "pricing", c: "Page" },
  { l: "Entrée express : points du français", r: "blog", c: "Blog" },
  { l: "Foire aux questions", r: "faq", c: "Page" },
];
