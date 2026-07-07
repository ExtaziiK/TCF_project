import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { startCheckout } from "@/services/stripeService";

export function PlanCard({ p, compact }) {
  const { c, nav, user, notify } = useApp();
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!user) { notify("Créez un compte gratuit pour vous abonner."); return nav("register"); }
    setBusy(true);
    try {
      await startCheckout(p.priceId);
    } catch {
      notify("Impossible de démarrer le paiement. Réessayez.");
      setBusy(false);
    }
  };

  return (
    <Card lift className={`p-7 flex flex-col relative ${p.featured ? "border-blue-600 border-2 shadow-2xl shadow-blue-600/15" : ""}`}>
      {p.featured && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2"><Pill tone="blue" className="shadow-lg"><Sparkles size={12} /> Le plus populaire</Pill></span>}
      <h3 className={`font-display font-bold text-lg ${c.text}`}>{p.name}</h3>
      <p className="mt-3"><span className="font-display font-extrabold text-4xl grad-text">{p.price}</span> <span className={`text-sm ${c.faint}`}>{p.per}</span></p>
      <ul className="mt-6 space-y-3 flex-1">
        {p.feats.slice(0, compact ? 4 : 99).map((f) => (
          <li key={f} className={`flex gap-2.5 text-sm ${c.sub}`}><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />{f}</li>
        ))}
      </ul>
      <Btn className="mt-7 w-full" variant={p.featured ? "accent" : "ghost"} disabled={busy} onClick={() => (p.price === "0 $" ? nav("register") : subscribe())}>{p.cta}</Btn>
    </Card>
  );
}
