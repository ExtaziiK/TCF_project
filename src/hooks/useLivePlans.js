import { useEffect, useState } from "react";
import { PLANS } from "@/constants/pricing";
import { fetchLivePlans } from "@/services/stripeService";

// PLANS ships with hand-written prices as an immediate fallback; this
// overlays the live Stripe amount once fetched, so any page showing pricing
// self-corrects if a price ever changes in the Stripe dashboard.
// Each plan carries `priceState`: "loading" until the live amount arrives,
// then "live" (Stripe answered) or "fallback" (it did not, so the figure is
// the hand-written one). PlanCard uses it to avoid ever printing a price it
// is not sure of — prices are admin-editable now, so a stale constant is a
// figure the buyer would expect us to honour.
export function useLivePlans() {
  const [plans, setPlans] = useState(() => PLANS.map((p) => ({ ...p, priceState: "loading" })));
  useEffect(() => {
    let cancelled = false;
    fetchLivePlans(PLANS).then((live) => { if (!cancelled) setPlans(live); });
    return () => { cancelled = true; };
  }, []);
  return plans;
}
