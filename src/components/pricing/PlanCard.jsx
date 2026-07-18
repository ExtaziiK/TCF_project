import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { startCheckout } from "@/services/stripeService";

// Per-plan accent, escalating with price. Full class strings (so Tailwind's JIT
// keeps them) plus a `grad` used for the CTA fill and the "popular" badge. The
// border is marked important to win over Card's default neutral border.
const ACCENTS = {
  slate: { price: "text-slate-500 dark:text-slate-300", border: "!border-slate-400/40", check: "text-slate-400", grad: "linear-gradient(90deg,#64748b,#94a3b8)" },
  sky: { price: "text-sky-600", border: "!border-sky-500/50", check: "text-sky-500", grad: "linear-gradient(90deg,#0284c7,#38bdf8)" },
  emerald: { price: "text-emerald-600", border: "!border-emerald-500/50", check: "text-emerald-500", grad: "linear-gradient(90deg,#059669,#34d399)" },
  violet: { price: "text-violet-600", border: "!border-violet-500/60", check: "text-violet-500", grad: "linear-gradient(90deg,#7c3aed,#c084fc)" },
  amber: { price: "text-amber-600", border: "!border-amber-500/60", check: "text-amber-500", grad: "linear-gradient(90deg,#d97706,#fbbf24)" },
};

export function PlanCard({ p, compact, promo }) {
  const { c, nav, user, notify, t } = useApp();
  const [busy, setBusy] = useState(false);
  const a = ACCENTS[p.accent] || ACCENTS.slate;
  const paid = !!p.priceId;

  const subscribe = async () => {
    if (!user) { notify(t("Créez un compte gratuit pour vous abonner.")); return nav("register"); }
    setBusy(true);
    try {
      await startCheckout(p.priceId, promo);
    } catch (err) {
      notify(t(err?.message === "already-subscribed"
        ? "Votre abonnement Premium est déjà actif. Gérez-le depuis votre profil."
        : err?.message === "invalid-promo"
          ? "Ce code promo n'est plus valide. Retirez-le et réessayez."
          : "Impossible de démarrer le paiement. Réessayez."));
      setBusy(false);
    }
  };

  return (
    <Card lift className={`p-7 flex flex-col relative ${a.border} ${p.featured ? "border-2 shadow-2xl shadow-black/5" : ""}`}>
      {p.featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg" style={{ background: a.grad }}>
          <Sparkles size={12} /> {t("Le plus populaire")}
        </span>
      )}
      <h3 className={`font-display font-bold text-lg ${c.text}`}>{t(p.name)}</h3>
      <p className="mt-3"><span className={`font-display font-extrabold text-4xl ${a.price}`}>{p.price}</span> <span className={`text-sm ${c.faint}`}>{t(p.per)}</span></p>
      <ul className="mt-6 space-y-3 flex-1">
        {p.feats.slice(0, compact ? 4 : 99).map((f) => (
          <li key={f} className={`flex gap-2.5 text-sm ${c.sub}`}><Check size={16} className={`${a.check} shrink-0 mt-0.5`} />{t(f)}</li>
        ))}
      </ul>
      <Btn
        className="mt-7 w-full"
        variant={paid ? "primary" : "ghost"}
        style={paid ? { background: a.grad } : undefined}
        disabled={busy}
        onClick={() => (paid ? subscribe() : nav("register"))}
      >{t(p.cta)}</Btn>
    </Card>
  );
}
