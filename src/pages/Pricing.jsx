import { useMemo, useState } from "react";
import { Gift, CheckCircle2, Shield, RotateCcw, CreditCard, XCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PlanCard } from "@/components/pricing/PlanCard";
import { useLivePlans } from "@/hooks/useLivePlans";
import { validatePromoCode, promoLabel } from "@/services/stripeService";
import { CURRENCIES, convertPrice } from "@/utils/currency";

export function Pricing() {
  const { c, t } = useApp();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null); // validated promo ({ code, percentOff | amountOff… })
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]); // USD = the currency actually charged
  const plans = useLivePlans();

  // Prices are stored/charged in USD; this rewrites the displayed figure into
  // the visitor's currency (indicative only). PlanCard's −50 % and promo math
  // still run on the converted string, so struck/discounted prices follow suit.
  const displayPlans = useMemo(
    () => plans.map((p) => ({ ...p, price: convertPrice(p.price, currency) })),
    [plans, currency]
  );

  // Real validation against Stripe (api/promo-validate); the applied code is
  // then attached to the Checkout session, so the discount the user sees here
  // is exactly what Stripe charges.
  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setChecking(true);
    setCouponError("");
    const r = await validatePromoCode(code);
    setChecking(false);
    if (!r.valid) {
      setApplied(null);
      setCouponError(r.unavailable ? t("Vérification indisponible ici (fonctions serverless non déployées).") : t("Ce code n'est pas valide, a expiré ou a atteint sa limite d'utilisation."));
      return;
    }
    setApplied(r);
  };

  return (
    <PageShell back wide eyebrow={t("Abonnements")} title={t("Un forfait pour chaque étape de votre préparation")} sub={t("Payez en dollars américains, en toute sécurité via Stripe. Changez ou annulez à tout moment depuis votre tableau de bord.")}>
      {/* Currency switch — indicative conversion only; Stripe still charges USD. */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-1 p-1.5 rounded-full border shadow-sm ${c.border} ${c.card}`} role="group" aria-label={t("Afficher les prix dans une autre devise")}>
          {CURRENCIES.map((cur) => {
            const active = cur.code === currency.code;
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => setCurrency(cur)}
                aria-pressed={active}
                className={`px-4 py-2 rounded-full text-sm font-bold transition ${active ? "text-white shadow" : `text-blue-600 ${c.hoverSoft}`}`}
                style={active ? { background: "linear-gradient(135deg,#2E6BE6,#5f93f2)" } : undefined}
              >
                {t(cur.label)}
              </button>
            );
          })}
        </div>
      </div>
      <p className={`text-center text-xs mt-3 mb-8 ${c.faint}`}>
        {currency.code === "USD"
          ? t("Tous les paiements sont effectués en dollars US (USD).")
          : t("Montants indicatifs — le paiement est effectué en dollars US (USD).")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-7xl mx-auto">
        {displayPlans.map((p, i) => <PlanCard key={p.name} p={p} promo={applied} index={i} />)}
      </div>
      <Card className="mt-10 max-w-xl mx-auto p-6">
        <p className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}><Gift size={16} className="text-rose-600" /> {t("Vous avez un code promo ?")}</p>
        <div className="flex gap-2">
          <input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setApplied(null); setCouponError(""); }} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} placeholder={t("Ex. : BIENVENUE20")} aria-label={t("Code promo")} className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-mono2 outline-none focus:border-blue-600 ${c.inputCls}`} />
          <Btn small disabled={checking || !coupon.trim()} onClick={applyCoupon}>{t(checking ? "Vérification…" : "Appliquer")}</Btn>
        </div>
        {applied && (
          <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5 rise">
            <CheckCircle2 size={15} /> {applied.code} : {promoLabel(applied)} {t(applied.duration === "forever" ? "sur tous les paiements" : applied.duration === "repeating" ? `pendant ${applied.durationInMonths} mois` : "sur le premier paiement")} — {t("appliqué automatiquement au paiement.")}
          </p>
        )}
        {couponError && <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5"><XCircle size={15} /> {couponError}</p>}
      </Card>
      <div className={`mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-center`}>
        {[{ icon: Shield, t: "Paiement chiffré Stripe" }, { icon: RotateCcw, t: "Satisfait ou remboursé" }, { icon: CreditCard, t: "Sans engagement" }].map((b) => (
          <div key={b.t} className={`p-4 rounded-2xl border ${c.border} ${c.card} flex flex-col items-center gap-2`}>
            <b.icon size={20} className="text-blue-600" /><p className={`text-sm font-medium ${c.sub}`}>{t(b.t)}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
