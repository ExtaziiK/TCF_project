import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { isStaff } from "@/auth/rbac";
import { useLivePlans } from "@/hooks/useLivePlans";
import { validatePromoCode } from "@/services/stripeService";
import { convertPrice, currencyForCountry, planDzdAmount, rememberCurrency, rememberedCurrency, USD } from "@/utils/currency";
import { detectCountry, guessCountry } from "@/utils/geo";
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
  const { user, role } = useApp();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null); // validated promo ({ code, percentOff | amountOff… })
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [dzPrices, setDzPrices] = useState({}); // owner's per-plan DZD overrides
  const plans = useLivePlans();

  // Which currency tab is open. USD is what Stripe charges, so it stays the
  // default everywhere except Algeria, where the dinar price IS the purchase
  // (CCP/BaridiMob) and a visitor landing on USD would never see the price
  // they can actually pay. Resolved in three steps so the tab never flips
  // under someone who has already touched it:
  //
  //   1. their own earlier choice this session, if any — it always wins;
  //   2. otherwise the browser's timezone/locale, read synchronously so the
  //      first paint is already on the right tab for most DZ visitors;
  //   3. then /api/public/geo (the edge's reading of the request IP), which corrects
  //      step 2 for a device whose locale disagrees with where it is.
  //
  // Nothing here touches what is charged — only which figures are displayed.
  const remembered = useMemo(() => rememberedCurrency(), []);
  const [currency, showCurrency] = useState(() => remembered || currencyForCountry(guessCountry()));
  const pickedByVisitor = useRef(!!remembered);
  // Best guess synchronously (timezone/locale), corrected below by the edge's
  // reading of the request IP once it answers.
  const [country, setCountry] = useState(guessCountry);

  const setCurrency = useCallback((cur) => {
    pickedByVisitor.current = true; // stop the geo answer from overriding them
    rememberCurrency(cur);
    showCurrency(cur);
  }, []);

  useEffect(() => {
    let cancelled = false;
    detectCountry().then((detected) => {
      if (cancelled || !detected) return; // offline, blocked, or no functions deployed
      setCountry(detected);
      if (!pickedByVisitor.current) showCurrency(currencyForCountry(detected));
    });
    return () => { cancelled = true; };
  }, []);

  // The dinar tab is a manual bank transfer meant for buyers actually in
  // Algeria, not a convenience conversion — offered only to a detected
  // Algerian IP or a signed-in account that gave "Algérie" as its country at
  // registration (Onboarding.jsx / AuthPage.jsx, both from the COUNTRIES list
  // in constants/exam.js — full French names, not ISO codes, so this compares
  // against the name, not "DZ"). Staff (admin/owner) always see it too — they
  // need it to check the manual-payment flow itself, regardless of where they
  // happen to be signed in from. See CURRENCIES filtering in PricingPlans.jsx,
  // which is where this actually hides the tab.
  const dzEligible = country === "DZ" || user?.country === "Algérie" || isStaff(role);

  // A DZD choice remembered from earlier this session (or picked in the brief
  // window before detectCountry() corrected an over-eager timezone guess) must
  // not leave the visitor stranded on a currency whose tab has just vanished.
  useEffect(() => {
    if (!dzEligible && currency.code === "DZD") {
      pickedByVisitor.current = false;
      rememberCurrency(null);
      showCurrency(USD);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dzEligible]);

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

  // Real validation against Stripe (api/public/promo-validate); the applied code is
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

  return { plans: displayPlans, currency, setCurrency, isDzd, dzEligible, coupon, editCoupon, applyCoupon, applied, dzUsablePromo, checking, couponError };
}
