import { Gift, CheckCircle2, XCircle, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { PlanCard } from "@/components/pricing/PlanCard";
import { promoLabel } from "@/services/stripeService";
import { CURRENCIES } from "@/utils/currency";

// The pricing controls: currency switch, the plan cards, and the promo field.
// Rendered identically by the Tarifs page and by the landing page's pricing
// section, from one `usePricingSelection()` state the caller owns — Tarifs also
// reads the chosen currency for the trust badges below it, which is why the
// state lives in the caller rather than in here.
//
// Nothing on this block requires an account. A visitor can switch to dinars,
// see the CCP/BaridiMob price and validate a promo code before signing up;
// only the purchase itself needs a login, since a pass has to attach to
// someone. The code they entered survives that signup (see setPendingPromo).
export function PricingPlans({ s, compact = false }) {
  const { c, t, dark } = useApp();

  return (
    <>
      {/* Currency switch — indicative conversion only; Stripe still charges USD. */}
      <div className={`flex justify-center ${s.currency.code === "EUR" ? "mb-8" : ""}`}>
        <div className={`inline-flex items-center gap-1 p-1.5 rounded-full border shadow-sm ${c.border} ${c.card}`} role="group" aria-label={t("Afficher les prix dans une autre devise")}>
          {CURRENCIES.map((cur) => {
            const active = cur.code === s.currency.code;
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => s.setCurrency(cur)}
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
      {s.currency.code === "USD" && (
        <p className={`text-center text-xs mt-3 mb-8 ${c.faint}`}>
          {t("Tous les paiements sont effectués en dollars US (USD).")}
        </p>
      )}
      {/* The dinar notice is not a footnote like the USD one: it is the only
          warning that this purchase is a MANUAL transfer (CCP/BaridiMob) with
          access opened after the receipt is checked, not an instant card
          payment. As grey hint text it went unread, so it gets a highlighted
          pill and a short flash — see .notice-flash in styles/index.css for why
          the flash stops on its own. role="status" so a screen reader announces
          it when the tab switches, since the flash means nothing there. */}
      {s.isDzd && (
        <div className="flex justify-center mt-3 mb-8">
          <p
            role="status"
            className={`notice-flash inline-flex items-start gap-2 max-w-xl text-xs sm:text-sm font-semibold leading-snug px-4 py-2.5 rounded-2xl border ${dark ? "bg-amber-500/15 border-amber-400/50 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900"}`}
          >
            <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-left">{t("Paiement en dinar algérien par CCP ou BaridiMob, avec activation après vérification du reçu.")}</span>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-7xl mx-auto">
        {s.plans.map((p, i) => <PlanCard key={p.name} p={p} promo={s.dzUsablePromo} compact={compact} index={i} currency={s.currency} />)}
      </div>

      <Card className="mt-10 max-w-xl mx-auto p-6">
        <p className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}><Gift size={16} className="text-rose-600" /> {t("Vous avez un code promo ?")}</p>
        <div className="flex gap-2">
          <input
            value={s.coupon}
            onChange={(e) => s.editCoupon(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") s.applyCoupon(); }}
            placeholder={t("Ex. : BIENVENUE20")}
            aria-label={t("Code promo")}
            className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-mono2 outline-none focus:border-blue-600 ${c.inputCls}`}
          />
          <Btn small disabled={s.checking || !s.coupon.trim()} onClick={s.applyCoupon}>{t(s.checking ? "Vérification…" : "Appliquer")}</Btn>
        </div>
        {s.applied && (
          <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5 rise">
            <CheckCircle2 size={15} /> {s.applied.code} : {promoLabel(s.applied)} {t(s.applied.duration === "forever" ? "sur tous les paiements" : s.applied.duration === "repeating" ? `pendant ${s.applied.durationInMonths} mois` : "sur le premier paiement")} — {t("appliqué automatiquement au paiement.")}
          </p>
        )}
        {s.couponError && (
          <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5">
            <XCircle size={15} />
            {t(s.couponError === "unavailable"
              ? "Vérification indisponible ici (fonctions serverless non déployées)."
              : "Ce code n'est pas valide, a expiré ou a atteint sa limite d'utilisation.")}
          </p>
        )}
        {/* A fixed-amount Stripe coupon is priced in USD; there is no honest way
            to subtract it from a dinar total, so say so rather than show a
            discount the manual payment will not honour. */}
        {s.isDzd && s.applied && !s.applied.percentOff && (
          <p className="mt-3 text-sm text-amber-600 flex items-start gap-1.5">
            <XCircle size={15} className="shrink-0 mt-0.5" /> {t("Ce code est un montant fixe en dollars : il ne peut pas s'appliquer à un paiement en dinars. Seuls les codes en pourcentage sont acceptés ici.")}
          </p>
        )}
      </Card>
    </>
  );
}
