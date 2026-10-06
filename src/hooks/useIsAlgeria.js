import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { detectCountry, guessCountry } from "@/utils/geo";

// Whether to talk to this visitor about CCP / BaridiMob. Same rule as the DZD
// tab on Tarifs (usePricingSelection): an Algerian connection, or an account
// that gave "Algérie" as its country. Those Algerian payment methods are
// mentioned to these visitors and to nobody else (FAQ, /code-promo).
export function useIsAlgeria() {
  const { user } = useApp();
  const [country, setCountry] = useState(guessCountry);
  useEffect(() => {
    let on = true;
    detectCountry().then((d) => { if (on && d) setCountry(d); });
    return () => { on = false; };
  }, []);
  return country === "DZ" || user?.country === "Algérie";
}
