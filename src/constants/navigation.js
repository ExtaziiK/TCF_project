import { ROLES } from "@/auth/rbac";

const { FREE_USER, PREMIUM_USER, ADMIN } = ROLES;
const PREMIUM = [PREMIUM_USER, ADMIN];

// Single source of truth for the navigation. Each entry may carry a `roles`
// array; entries without one are visible to everyone (including visitors).
// Visibility is resolved by navLinksForRole() — no component should filter
// the menu on its own. Note this only controls what the menu *shows*;
// actual access is enforced by the route guard (src/auth/rbac.js).
export const NAV_LINKS = [
  { l: "Accueil", r: "home" },
  // The four TCF épreuves live on one page (CO · CE · EO · EE), switched via
  // tabs. Free users see it too, with every quiz locked except the first of
  // each épreuve — the lock is enforced inside the page (BankExplorer).
  { l: "Mes examens", r: "exams" },
  // Mock exams get their own top-level entry, next to "Mes examens".
  { l: "Examens blancs", r: "mocks" },
  // Supplementary practice, distinct from the exam épreuves.
  { l: "Pratique", menu: [
    { l: "Vocabulaire", r: "vocabulary", roles: PREMIUM },
    { l: "Grammaire", r: "grammar", roles: PREMIUM },
  ] },
  { l: "Tarifs", r: "pricing" },
  { l: "Blogue", r: "blog" },
  { l: "FAQ", r: "faq" },
  { l: "À propos", r: "about" },
];

// Extra entries that only exist in the mobile menu for signed-in users.
export const ACCOUNT_LINKS = [
  { l: "Tableau de bord", r: "dashboard", roles: [FREE_USER, PREMIUM_USER, ADMIN] },
  { l: "Mon profil", r: "profile", roles: [FREE_USER, PREMIUM_USER, ADMIN] },
  { l: "Administration", r: "admin", roles: [ADMIN] },
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
  { l: "Examens blancs TCF Canada", r: "mocks", c: "Examens" },
  { l: "Tarifs et abonnements", r: "pricing", c: "Page" },
  { l: "Entrée express : points du français", r: "blog", c: "Blogue" },
  { l: "Foire aux questions", r: "faq", c: "Page" },
];
