// Role lists come from rbac.js rather than being rebuilt here: this file used
// to declare its own role list that omitted OWNER, so an owner saw no
// "Pratique" menu (and no account links on mobile) for pages the guard happily
// let them open. One definition, no drift.
import { AUTHENTICATED, ADMIN_ONLY, ROLES, canUseNotebook } from "@/auth/rbac";
import {
  Home, GraduationCap, ClipboardCheck, Sparkles, BookOpen, SpellCheck,
  Languages, PenLine, CreditCard, Calculator, LayoutDashboard, User, Shield, Mail,
  ListChecks, BadgeCheck, NotebookPen, Dumbbell, Compass, Newspaper, Star,
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
// `tier` sets an entry's colour, in the bar and the drawer alike (Nav.jsx):
// "primary" (TCF blanc only) the brand gradient, "featured" (the main
// sections) brand blue, both with their icon; entries without one are grey,
// no icon. Same weight for all.
//
// `icon`, `group` and `order` are read only by the mobile drawer (see
// MOBILE_GROUPS and mobileNavForRole below); the desktop bar ignores all three.
// In particular "Accueil" must stay FIRST here for the desktop bar, so the
// drawer expresses its own order through `order` rather than by moving entries.
export const NAV_LINKS = [
  // Visitors only. Signed in, "/" redirects to the dashboard (Home.jsx), so an
  // "Accueil" entry would be a second label for "Tableau de bord" — the same
  // room behind two doors, which is what this merge removed. This is the
  // narrow-`roles` case the note above warns about, and it is deliberate
  // rather than an oversight: the landing page really is unreachable for them
  // (staff excepted, and they reach it through the logo, not through here).
  { l: "Accueil", r: "home", roles: [ROLES.VISITOR], icon: Home, group: "start", order: 3 },
  // Bar order, by importance: TCF blanc, Épreuves, Pratique, then the month's
  // subjects.
  // Mock exams: the flagship, first in the bar.
  { l: "TCF blanc", r: "mocks", tier: "primary", icon: ClipboardCheck, group: "prep" },
  // The four TCF épreuves live on one page (CO · CE · EO · EE), switched via
  // tabs. Free users see it too, with every quiz locked except the first of
  // each épreuve — the lock is enforced inside the page (BankExplorer).
  { l: "Épreuves", r: "exams", tier: "featured", icon: GraduationCap, group: "prep" },
  // Supplementary practice, distinct from the exam épreuves. Ordered from the
  // building blocks up to the exercise that uses them: vocabulary and grammar
  // are things you study, the dictée is where they are tested together.
  //
  // Gated as a whole, unlike "TCF blanc" and "Épreuves": for a visitor both
  // study entries were filtered out and the menu opened onto the single
  // remaining item, which reads as a broken dropdown rather than as an offer.
  // Visitors are pitched by the home page and the route guard instead.
  // `r`: on the desktop bar « Exercices » is a plain link to the exercises hub
  // (pages/Pratique.jsx), whose tabs are the tools below; the mobile drawer,
  // which has no dropdown, still lists the tools one by one.
  { l: "Exercices", r: "entrainement", tier: "featured", icon: Dumbbell, roles: AUTHENTICATED, menu: [
    // First in the menu, the flagship exercise. NO `roles`, deliberately, and not an oversight: la dictée is Premium
    // (rbac.js → dictee: PREMIUM) but stays visible to free accounts, who land
    // on its sales page instead of the exercise. Hiding it would mean nobody
    // who has not already paid ever learns it exists. Visitors no longer reach
    // it here — the parent menu is signed-in only — but the route itself stays
    // public, so a shared /dictee link still opens the pitch.
    { l: "La dictée", r: "dictee", tier: "featured", icon: PenLine, group: "train" },
    { l: "Vocabulaire", r: "vocabulary", roles: AUTHENTICATED, icon: BookOpen, group: "train" },
    { l: "Grammaire", r: "grammar", roles: AUTHENTICATED, icon: SpellCheck, group: "train" },
    { l: "Conjugaison", r: "conjugation", roles: AUTHENTICATED, icon: Languages, group: "train" },
    // After the study tools: it is where every other exercise sends its mistakes.
    // `soon`: shown greyed with a « Bientôt » tag and not clickable, for the
    // roles it returns true for (see NOTEBOOK_PUBLIC in rbac.js).
    { l: "Carnet d'erreurs", r: "carnet", roles: AUTHENTICATED, soon: (role) => !canUseNotebook(role), icon: NotebookPen, group: "train" },
    // Même cas que la dictée, et pour la même raison : "revision" est Premium
    // (rbac.js), mais sans `roles` ici un compte gratuit voit l'entrée et tombe
    // sur la page de vente plutôt que sur un menu qui ne mentionne jamais ce
    // qu'il pourrait acheter. Le garde de route décide de l'accès, pas le menu.
    { l: "Révision", r: "revision", icon: ListChecks, group: "train" },
  ] },
  // Trending monthly EE/EO subjects to prepare — featured like "Épreuves",
  // but signed-in only (free or paid), so it's hidden from visitors (roles must
  // match sujets-actualite's PAGE_ACCESS list in rbac.js). The label shown is
  // the newest month's (« Sujets de septembre », Nav.jsx); `l` is the fallback.
  { l: "Sujets EE/EO", r: "sujets-actualite", tier: "featured", roles: AUTHENTICATED, icon: Sparkles, group: "prep" },
  { l: "Tarifs", r: "pricing", icon: CreditCard, group: "tools" },
  { l: "Calculateur", r: "calculator", icon: Calculator, group: "tools" },
];

// The desktop bar for VISITORS, laid out the way SaaS sites usually are —
// two dropdowns that describe the offer (« Produit »: TCF blanc, Épreuves,
// Exercices; « Ressources »: guide, blog, avis, calculateur), then « Tarifs »,
// with « Connexion » and the sign-up call to action on the right. The logo is
// the way home, so there is no « Accueil » link. A visitor opening a page that
// needs an account (Exercices) gets the route guard's log-in / sign-up. Signed-in accounts keep the
// working bar above (NAV_LINKS); the mobile drawer is the same for both.
export const VISITOR_MENUS = [
  { l: "Produit", items: [
    { l: "TCF blanc", r: "mocks", icon: ClipboardCheck, d: "Les quatre épreuves en conditions réelles, notées sur 699" },
    { l: "Épreuves", r: "exams", icon: GraduationCap, d: "Compréhension et expression, au format officiel" },
    // The Exercices hub: la dictée is one of its tools, alongside the others.
    { l: "Exercices", r: "entrainement", icon: Dumbbell, d: "Dictée, vocabulaire, grammaire et conjugaison" },
  ] },
  { l: "Ressources", items: [
    { l: "Guide de l'examen", r: "guide", icon: Compass, d: "Tout le déroulé du TCF Canada, épreuve par épreuve" },
    { l: "Blog", r: "blog", icon: Newspaper, d: "Conseils et méthodes pour réussir" },
    { l: "Avis", r: "avis", icon: Star, d: "Ce qu'en disent nos candidats" },
    { l: "Calculateur", r: "calculator", icon: Calculator, d: "Vos scores TCF convertis en niveaux NCLC" },
  ] },
];
export const VISITOR_LINKS = [{ l: "Tarifs", r: "pricing" }];

// Extra entries that only exist in the mobile menu for signed-in users.
// All three sit in the top group, above the study sections and under no
// heading: they are the "where am I / who am I" block, the part of the drawer
// someone reaches for between sessions rather than while revising. A separate
// "Mon compte" section at the bottom put them the furthest possible scroll
// from the identity card that introduces them.
//
// "Mon profil" then "Administration" lead the block, ahead of Accueil and
// Tableau de bord: for the people who actually open this menu daily — staff —
// those are the two destinations, and they sit directly under the identity
// card that names the account they act on.
export const ACCOUNT_LINKS = [
  { l: "Tableau de bord", r: "dashboard", roles: AUTHENTICATED, icon: LayoutDashboard, group: "start", order: 4 },
  { l: "Mon profil", r: "profile", roles: AUTHENTICATED, icon: User, group: "start", order: 1 },
  { l: "Administration", r: "admin", roles: ADMIN_ONLY, icon: Shield, group: "start", order: 2 },
  // Moderators only — staff approve the same queue from Administration →
  // Demandes. `can` gates on the account rather than the role (see
  // canModerate in rbac.js for why moderation is not a role).
  { l: "Validation", r: "moderation", can: (user) => !!user?.moderator, icon: BadgeCheck, group: "start", order: 2 },
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

// Resolves `soon` to a plain boolean for this role, so the nav only reads it.
const withSoon = (item, role) => (typeof item.soon === "function" ? { ...item, soon: item.soon(role) } : item);

const visible = (item, role, user) => (!item.roles || item.roles.includes(role)) && (!item.can || item.can(user));

// Returns the nav tree filtered for a role. Menus keep only the entries the
// role may see; a menu with no visible entries is dropped entirely.
// The tools behind "Pratique" — all six render the Pratique hub
// (pages/Pratique.jsx), which shows them as tabs in this order.
export const PRATIQUE_MENU = NAV_LINKS.find((n) => n.r === "entrainement").menu;
export const PRATIQUE_ROUTES = new Set(["entrainement", ...PRATIQUE_MENU.map((m) => m.r)]);

export function navLinksForRole(links, role, user) {
  return links
    .filter((n) => visible(n, role, user))
    .map((n) => (n.menu ? { ...n, menu: n.menu.filter((m) => visible(m, role, user)).map((m) => withSoon(m, role)) } : withSoon(n, role)))
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
export function mobileNavForRole(role, user) {
  const flat = [
    ...navLinksForRole(NAV_LINKS, role).flatMap((n) => (n.menu ? n.menu : [n])),
    ...navLinksForRole(ACCOUNT_LINKS, role, user),
    ...MOBILE_ONLY_LINKS,
  ];
  const bucket = (item) => (GROUP_IDS.has(item.group) ? item.group : "tools");
  return MOBILE_GROUPS
    .map((g) => ({
      ...g,
      // `order` sorts WITHIN a group only, never across groups, and defaults to
      // 0 so a group whose entries don't use it keeps the order they are
      // declared in — Array#sort is stable, so that fallback is a real
      // guarantee and not luck. It exists because the flat list is a
      // concatenation (NAV_LINKS, then ACCOUNT_LINKS), which fixes "Accueil"
      // ahead of every account link; the drawer wants the opposite, and moving
      // "Accueil" out of first place in NAV_LINKS would reorder the desktop bar.
      items: flat.filter((item) => bucket(item) === g.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((g) => g.items.length > 0);
}
