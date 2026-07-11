import { CheckCircle2, Lock, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { AuthPage } from "@/components/auth/AuthPage";
import { deniedReason } from "@/auth/rbac";

// Landing shown to visitors who try to open the free practice (or any
// registered-only content): explains the benefits of a free account.
function RegisterGate() {
  const { c, nav, t } = useApp();
  const perks = [
    "10 questions gratuites par jour et par module",
    "Un quiz complet offert dans chaque épreuve, au format officiel TCF",
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
function UpgradeGate() {
  const { c, nav, t } = useApp();
  return (
    <PageShell eyebrow={t("Contenu Premium")} title={t("Ce module fait partie de l'abonnement Premium")} sub={t("Passez au forfait Premium pour débloquer tous les modules, les TCF blancs complets et l'analyse IA.")}>
      <Card className="max-w-xl mx-auto p-8 text-center border-2 border-blue-600/40">
        <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Crown size={22} /></span>
        <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t("Débloquez tout Passerelle")}</p>
        <p className={`text-sm mt-1.5 ${c.sub}`}>{t("Questions illimitées, les quatre épreuves, TCF blancs et suivi CECR dès 19 $ / mois.")}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Btn variant="accent" onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
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
export function RouteGuard({ route, children }) {
  const { role, authReady } = useApp();
  if (!authReady) return null; // avoid flashing a gate while the session loads
  const reason = deniedReason(role, route);
  if (!reason) return children;
  if (reason === "register") return <RegisterGate />;
  if (reason === "login") return <AuthPage mode="login" />;
  if (reason === "upgrade") return <UpgradeGate />;
  return <ForbiddenGate />;
}
