import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { startCheckout } from "@/services/stripeService";

// Accents grade along the brand gradient, from blue (cheapest) to red (most
// expensive). `grad` drives the price text, the "popular" badge and the CTA;
// `solid` drives the eyebrow, border, checks and the hover glow. (Inline
// styles, so the ramp isn't tied to a Tailwind palette.)
const ACCENTS = {
  blue: { solid: "#2E6BE6", grad: "linear-gradient(135deg,#2E6BE6,#5f93f2)" },
  indigo: { solid: "#5158E4", grad: "linear-gradient(135deg,#5158E4,#8288f0)" },
  violet: { solid: "#6C4FE0", grad: "linear-gradient(135deg,#6C4FE0,#9a83f2)" },
  rose: { solid: "#A8407C", grad: "linear-gradient(135deg,#A8407C,#cf6ba3)" },
  red: { solid: "#D8354A", grad: "linear-gradient(135deg,#D8354A,#ef6f7e)" },
};

export function PlanCard({ p, compact, promo, index = 0 }) {
  const { c, nav, user, notify, t } = useApp();
  const [busy, setBusy] = useState(false);
  const a = ACCENTS[p.accent] || ACCENTS.gray;
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

  const gradText = { backgroundImage: a.grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };

  return (
    // Staggered entrance on the wrapper so the card itself keeps a clean
    // transform for the hover lift (a finished `rise` would otherwise pin it).
    <div className="rise h-full" style={{ animationDelay: `${index * 0.07}s` }}>
      <Card
        lift={false}
        style={{ borderColor: a.solid + (p.featured ? "cc" : "55"), "--plan-glow": a.solid + "5e" }}
        className={`plan-card relative h-full p-7 flex flex-col ${p.featured ? "border-2" : ""}`}
      >
        <span className="plan-sheen" aria-hidden="true" />
        {p.featured && (
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg" style={{ background: a.grad }}>
            <Sparkles size={12} /> {t("Le plus populaire")}
          </span>
        )}
        <div className="relative z-10 flex flex-col flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: a.solid }}>{t("Plan")}</p>
          <h3 className={`font-display font-bold text-lg ${c.text}`}>{t(p.name)}</h3>
          <p className="mt-3">
            <span className="metal-text font-display font-extrabold text-4xl" style={gradText}>{p.price}</span>{" "}
            <span className={`text-sm ${c.faint}`}>{t(p.per)}</span>
          </p>
          <ul className="mt-6 space-y-3 flex-1">
            {p.feats.slice(0, compact ? 4 : 99).map((f) => (
              <li key={f} className={`flex gap-2.5 text-sm ${c.sub}`}><Check size={16} color={a.solid} className="shrink-0 mt-0.5" />{t(f)}</li>
            ))}
          </ul>
          <Btn
            className="mt-7 w-full"
            variant={paid ? "primary" : "ghost"}
            style={paid ? { background: a.grad } : undefined}
            disabled={busy}
            onClick={() => (paid ? subscribe() : nav("register"))}
          >{t(p.cta)}</Btn>
        </div>
      </Card>
    </div>
  );
}
