import { CheckCircle2, Lock, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { lazy, Suspense } from "react";
import { deniedReason } from "@/auth/rbac";
import { PRATIQUE_ROUTES } from "@/constants/navigation";
import { useLivePlans } from "@/hooks/useLivePlans";

// Routes that argue their own case instead of showing the generic gate.
//
// "Ce module fait partie de l'abonnement Premium" is enough for a module whose
// worth is obvious from its name — everyone knows what a mock exam is for. It
// is not enough for the dictée: nobody arrives already knowing why a dictation
// would tell them anything about their French, so the door has to explain what
// is behind it. Add a route here only when that is true of it; the generic gate
// is the right default for everything else.
//
// The pitch receives `reason`, because a visitor with no account and a free
// account that needs a forfait are two different asks.
//
// Both these and the login page are loaded only when a gate actually shows
// them, which keeps them out of the bundle every page downloads.
const DicteePitch = lazy(() => import("@/components/dictee/DicteePitch").then((m) => ({ default: m.DicteePitch })));
const AuthPage = lazy(() => import("@/components/auth/AuthPage").then((m) => ({ default: m.AuthPage })));
const PITCH_PAGES = { dictee: DicteePitch };

// What a VISITOR (reason "register") sees on the navbar's « Produit » pages
// instead of the generic sign-up gate: one pitch per product, each arguing its
// own case (components/auth/ProductPitch.jsx). The old per-épreuve routes open
// the Épreuves hub, and every tool of the Exercices notebook opens the
// notebook's — but la dictée, which has its own (the visitors' version of the
// DicteePitch above, which free accounts still get).
const pitch = (name) => lazy(() => import("@/components/auth/ProductPitch").then((m) => ({ default: m[name] })));
const MocksPitch = pitch("MocksPitch");
const ExamsPitch = pitch("ExamsPitch");
const ExercicesPitch = pitch("ExercicesPitch");
const DicteeVisitorPitch = pitch("DicteeVisitorPitch");
const SujetsPitch = pitch("SujetsPitch");
const VISITOR_PITCH = {
  mocks: MocksPitch,
  ...Object.fromEntries(["exams", "practice", "listening", "reading", "writing", "speaking"].map((r) => [r, ExamsPitch])),
  ...Object.fromEntries([...PRATIQUE_ROUTES].filter((r) => r !== "dictee").map((r) => [r, ExercicesPitch])),
  dictee: DicteeVisitorPitch,
  "sujets-actualite": SujetsPitch,
  "sujets-ee": SujetsPitch,
  "sujets-eo": SujetsPitch,
};
const Gate = ({ children }) => <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>{children}</Suspense>;

// Landing shown to visitors who try to open the free practice (or any
// registered-only content): explains the benefits of a free account.
function RegisterGate() {
  const { c, nav, t } = useApp();
  const perks = [
    "Un quiz complet offert dans chaque épreuve, au format officiel TCF",
    "Corrections détaillées et explications après chaque quiz",
    "Votre progression et vos signets sauvegardés",
    "Gratuit, sans carte bancaire — prêt en 30 secondes",
  ];
  return (
    <PageShell eyebrow={t("Pratique gratuite")} title={t("Créez un compte gratuit pour commencer")} sub={t("La pratique gratuite est réservée aux membres inscrits. L'inscription prend 30 secondes et ne demande aucune carte bancaire.")}>
      <Card className="max-w-xl mx-auto p-8">
        <ul className="space-y-3">
          {perks.map((p) => (
            <li key={p} className={`flex items-start gap-3 text-sm ${c.sub}`}>
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />{t(p)}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <Btn className="flex-1" variant="accent" onClick={() => nav("register")}>{t("Créer un compte gratuitement")}</Btn>
          <Btn className="flex-1" variant="ghost" onClick={() => nav("login")}>{t("J'ai déjà un compte")}</Btn>
        </div>
      </Card>
    </PageShell>
  );
}

// Shown to free users who open premium content.
//
// The passes are one-time purchases, not a subscription, and their prices are
// set in the admin (Stripe): the starting price is read live, like the pricing
// cards do, and left out until it is known rather than printed from a figure
// that may be out of date.
function UpgradeGate() {
  const { c, nav, t } = useApp();
  const plans = useLivePlans();
  const cheapest = plans.find((p) => p.slug && p.priceState === "live");
  return (
    <PageShell eyebrow={t("Accès complet")} title={t("Ce module fait partie de l'accès complet")} sub={t("Un accès payant débloque tous les modules, les TCF blancs et l'analyse IA, pour la durée de votre choix. Paiement unique, sans abonnement.")}>
      <Card className="max-w-xl mx-auto p-8 text-center border-2 border-blue-600/40">
        <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Crown size={22} /></span>
        <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t("Débloquez tout Passerelle")}</p>
        <p className={`text-sm mt-1.5 ${c.sub}`}>{t("Les 80 quiz, la dictée, la révision, les TCF blancs et la correction IA de l'écrit et de l'oral.")}</p>
        {cheapest && <p className={`text-sm mt-1 font-semibold ${c.text}`}>{t("À partir de")} {cheapest.price} · {t(cheapest.per)}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Btn variant="accent" onClick={() => nav("pricing")}>{t("Voir les tarifs")}</Btn>
          <Btn variant="ghost" onClick={() => nav("practice")}>{t("Continuer en gratuit")}</Btn>
        </div>
      </Card>
    </PageShell>
  );
}

// Shown to authenticated non-admins on admin-only routes (403).
function ForbiddenGate() {
  const { c, nav, t } = useApp();
  return (
    <PageShell eyebrow={t("Accès refusé")} title={t("Cette page est réservée à l'administration")} sub={t("Votre compte ne dispose pas des autorisations nécessaires pour consulter cette page.")}>
      <Card className="max-w-xl mx-auto p-8 text-center">
        <Lock size={28} className={`mx-auto ${c.faint}`} />
        <p className={`text-sm mt-4 ${c.sub}`}>{t("Code d'erreur : 403 — autorisation insuffisante.")}</p>
        <div className="mt-6 flex justify-center"><Btn variant="ghost" onClick={() => nav("home")}>{t("Retour à l'accueil")}</Btn></div>
      </Card>
    </PageShell>
  );
}

// Central route guard: every routed page renders through this component
// (see App.jsx), so authorization is enforced in exactly one place. Hiding
// a nav item is cosmetic; this is what actually blocks the route.
//
// The six practice routes all render the Pratique hub, which guards each tool
// inside its sheet (`inner`): a signed-in member always gets the hub, so a
// free account meets the dictée's pitch inside the binder, not instead of it.
// Visitors keep the per-route gates (the dictée's public pitch, or sign-up).
export function RouteGuard({ route, children, inner }) {
  const { role, user, authReady } = useApp();
  // While the session loads, hold the page's space rather than rendering
  // nothing: with an empty page the footer was drawn right under the nav,
  // filling the screen, then shoved away when the content arrived — a layout
  // shift of nearly the whole viewport (PageSpeed CLS ≈ 1). Still no gate
  // flash: the placeholder is blank.
  if (!authReady) return <div className="min-h-screen" aria-busy="true" />;
  if (!inner && user && PRATIQUE_ROUTES.has(route)) return children;
  const reason = deniedReason(role, route, user);
  if (!reason) return children;
  // A route with its own sales page handles both "you need an account" and
  // "you need a forfait" itself — it is the same argument either way, only the
  // button at the end differs. "login" and "forbidden" are never pitched: one
  // is an account page, the other a 403.
  const VisitorPitch = VISITOR_PITCH[route];
  if (VisitorPitch && reason === "register") return <Gate><VisitorPitch /></Gate>;
  const Pitch = PITCH_PAGES[route];
  if (Pitch && (reason === "register" || reason === "upgrade")) return <Gate><Pitch reason={reason} /></Gate>;
  if (reason === "register") return <RegisterGate />;
  if (reason === "login") return <Gate><AuthPage mode="login" /></Gate>;
  if (reason === "upgrade") return <UpgradeGate />;
  return <ForbiddenGate />;
}
