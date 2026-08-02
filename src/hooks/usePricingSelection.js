import { useEffect, useMemo, useState } from "react";
import { useLivePlans } from "@/hooks/useLivePlans";
import { validatePromoCode } from "@/services/stripeService";
import { CURRENCIES, convertPrice, planDzdAmount } from "@/utils/currency";
import { getPaymentDz } from "@/services/settingsService";
import { getPendingPromo, setPendingPromo } from "@/utils/dzCheckout";

// Everything the pricing UI needs to decide what to show: the live plans, the
// display currency, and a validated promo. Owned by a hook rather than by a
// component so the Tarifs page and the landing page's pricing block share one
// implementation — the two drifted apart before, and only Tarifs had the promo
// field, which meant a visitor arriving from the home page had nowhere to enter
// a code they had been given.
//
// The caller renders; this only decides.
export function usePricingSelection() {
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null); // validated promo ({ code, percentOff | amountOff… })
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]); // USD = the currency actually charged
  const [dzPrices, setDzPrices] = useState({}); // owner's per-plan DZD overrides
  const plans = useLivePlans();

  // The DZD prices set by the owner in Admin → Tarifs. Loaded once so the cards
  // match exactly what the manual checkout will charge.
  useEffect(() => { getPaymentDz().then((cfg) => setDzPrices(cfg.prices || {})); }, []);

  // A code applied before signing up has to survive the trip through
  // registration. Buying requires an account, so anyone who enters a code on
  // the landing page is sent to the signup form mid-purchase; without this the
  // discount they were just shown would silently vanish on the way back, which
  // is worse than never having offered the field. Re-validated rather than
  // trusted: the stored code is only a string, and Stripe is still the judge.
  useEffect(() => {
    const saved = getPendingPromo();
    if (!saved) return;
    let cancelled = false;
    validatePromoCode(saved).then((r) => {
      if (cancelled) return;
      if (r.valid) { setApplied(r); setCoupon(saved); }
      else setPendingPromo(null); // expired or spent while they were away
    });
    return () => { cancelled = true; };
  }, []);

  // Prices are stored/charged in USD; this rewrites the displayed figure into
  // the visitor's currency. For DZD, the owner's explicit price wins (falling
  // back to the auto-converted amount); other currencies are indicative
  // conversions. PlanCard's −50 % and promo math still run on the string.
  const isDzd = currency.code === "DZD";
  // DZD is paid by manual transfer, so a Stripe coupon can only be honoured
  // when it is a percentage — that arithmetic works on any currency. A
  // fixed-amount USD coupon is dropped for DZD and explained in the UI.
  const dzUsablePromo = isDzd ? (applied?.percentOff ? applied : null) : applied;

  const displayPlans = useMemo(
    () => plans.map((p) => ({
      ...p,
      price: currency.code === "DZD" ? planDzdAmount(p, dzPrices) : convertPrice(p.price, currency),
    })),
    [plans, currency, dzPrices],
  );

  // Real validation against Stripe (api/promo-validate); the applied code is
  // then attached to the Checkout session, so the discount shown here is
  // exactly what Stripe charges.
  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setChecking(true);
    setCouponError("");
    const r = await validatePromoCode(code);
    setChecking(false);
    if (!r.valid) {
      setApplied(null);
      setPendingPromo(null);
      setCouponError(r.unavailable ? "unavailable" : "invalid");
      return;
    }
    setApplied(r);
    setPendingPromo(code);
  };

  const editCoupon = (value) => {
    setCoupon(value.toUpperCase());
    setApplied(null);
    setCouponError("");
    setPendingPromo(null);
  };

  return { plans: displayPlans, currency, setCurrency, isDzd, coupon, editCoupon, applyCoupon, applied, dzUsablePromo, checking, couponError };
}
