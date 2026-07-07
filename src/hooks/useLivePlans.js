import { useEffect, useState } from "react";
import { PLANS } from "@/constants/pricing";
import { fetchLivePlans } from "@/services/stripeService";

// PLANS ships with hand-written prices as an immediate fallback; this
// overlays the live Stripe amount once fetched, so any page showing pricing
// self-corrects if a price ever changes in the Stripe dashboard.
export function useLivePlans() {
  const [plans, setPlans] = useState(PLANS);
  useEffect(() => {
    let cancelled = false;
    fetchLivePlans(PLANS).then((live) => { if (!cancelled) setPlans(live); });
    return () => { cancelled = true; };
  }, []);
  return plans;
}
