import { Shield, RotateCcw, CreditCard } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { usePricingSelection } from "@/hooks/usePricingSelection";

// The Tarifs page: the plans (PricingPlans → PlanCard), then a trust band.

export function Pricing() {
  const { c, t } = useApp();
  // Shared with the landing page's pricing section. Owned here rather than
  // inside PricingPlans because the trust band below reads the currency too.
  const s = usePricingSelection();
  const trust = [
    { icon: Shield, t: s.currency.code === "DZD" ? "Paiement local sécurisé" : "Paiement chiffré Stripe" },
    { icon: RotateCcw, t: "Satisfait ou remboursé" },
    { icon: CreditCard, t: "Sans abonnement" },
  ];

  return (
    <PageShell back wide center eyebrow={t("Tarifs")} title={t("Choisissez votre accès")}
      sub={t("Un paiement unique pour la durée de votre choix, sans abonnement ni renouvellement automatique. Paiement sécurisé via Stripe.")}>
      <PricingPlans s={s} />

      {/* Trust band: one strip, three reassurances. */}
      <Card className="mt-12 max-w-3xl mx-auto grid sm:grid-cols-3">
        {trust.map((b, i) => (
          <div key={b.t} className={`flex items-center justify-center gap-2.5 px-5 py-4 ${i ? `border-t sm:border-t-0 sm:border-l ${c.border}` : ""}`}>
            <b.icon size={18} className="text-blue-600 shrink-0" />
            <p className={`text-sm font-semibold ${c.text}`}>{t(b.t)}</p>
          </div>
        ))}
      </Card>

    </PageShell>
  );
}
