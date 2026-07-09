import { useState } from "react";
import { Gift, CheckCircle2, Shield, RotateCcw, CreditCard } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PlanCard } from "@/components/pricing/PlanCard";
import { useLivePlans } from "@/hooks/useLivePlans";

export function Pricing() {
  const { c, notify, t } = useApp();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);
  const plans = useLivePlans();

  return (
    <PageShell back wide eyebrow={t("Abonnements")} title={t("Un forfait pour chaque étape de votre préparation")} sub={t("Payez en dollars canadiens, en toute sécurité via Stripe. Changez ou annulez à tout moment depuis votre tableau de bord.")}>
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {plans.map((p) => <PlanCard key={p.name} p={p} />)}
      </div>
      <Card className="mt-10 max-w-xl mx-auto p-6">
        <p className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}><Gift size={16} className="text-rose-600" /> {t("Vous avez un code promo ?")}</p>
        <div className="flex gap-2">
          <input value={coupon} onChange={(e) => { setCoupon(e.target.value); setApplied(false); }} placeholder={t("Ex. : BIENVENUE20")} aria-label={t("Code promo")} className={`flex-1 px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
          <Btn small onClick={() => { if (coupon.trim().toUpperCase() === "BIENVENUE20") { setApplied(true); notify(t("Code appliqué : −20 % sur votre premier mois !")); } else notify(t("Ce code n'est pas valide. Essayez BIENVENUE20.")); }}>{t("Appliquer")}</Btn>
        </div>
        {applied && <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5 rise"><CheckCircle2 size={15} /> {t("−20 % appliqué sur votre premier mois Premium.")}</p>}
      </Card>
      <div className={`mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-center`}>
        {[{ icon: Shield, t: "Paiement chiffré Stripe" }, { icon: RotateCcw, t: "Garantie 30 jours (annuel)" }, { icon: CreditCard, t: "Sans engagement" }].map((b) => (
          <div key={b.t} className={`p-4 rounded-2xl border ${c.border} ${c.card} flex flex-col items-center gap-2`}>
            <b.icon size={20} className="text-blue-600" /><p className={`text-sm font-medium ${c.sub}`}>{t(b.t)}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
