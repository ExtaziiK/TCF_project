import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { startCheckout } from "@/services/stripeService";

// Accents grade along the brand gradient, from blue up through red, then gold
// for the top VIP tier. `grad` drives the price text, the "popular" badge and
// the CTA; `solid` drives the eyebrow, border, checks and the hover glow.
// (Inline styles, so the ramp isn't tied to a Tailwind palette.)
const ACCENTS = {
  blue: { solid: "#2E6BE6", grad: "linear-gradient(135deg,#2E6BE6,#5f93f2)" },
  violet: { solid: "#6C4FE0", grad: "linear-gradient(135deg,#6C4FE0,#9a83f2)" },
  rose: { solid: "#A8407C", grad: "linear-gradient(135deg,#A8407C,#cf6ba3)" },
  red: { solid: "#D8354A", grad: "linear-gradient(135deg,#D8354A,#ef6f7e)" },
  gold: { solid: "#b8860b", grad: "linear-gradient(135deg,#b8860b,#f6d365)" },
};

export function PlanCard({ p, compact, promo, index = 0 }) {
  const { c, nav, user, notify, t } = useApp();
  const [busy, setBusy] = useState(false);
  const a = ACCENTS[p.accent] || ACCENTS.blue;
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
    // The popular plan scales up on the outer wrapper (kept off the animated
    // `.rise` layer and the hover-lift `.plan-card` layer, so none fight over
    // `transform`). Staggered entrance sits on the middle layer.
    <div className={`h-full ${p.featured ? "relative lg:z-10 lg:scale-[1.05]" : ""}`}>
      <div className="rise h-full" style={{ animationDelay: `${index * 0.07}s` }}>
        <Card
          lift={false}
          style={{ borderColor: a.solid + (p.featured ? "cc" : "55"), "--plan-glow": a.solid + (p.featured ? "85" : "5e") }}
          className={`plan-card relative h-full p-7 flex flex-col ${p.featured ? "border-2 shadow-2xl" : ""}`}
        >
          {p.featured && <span className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: a.grad, opacity: 0.08 }} aria-hidden="true" />}
          <span className="plan-gloss" aria-hidden="true" />
          <span className={`plan-sheen${p.featured ? " is-auto" : ""}`} aria-hidden="true" />
          {p.featured && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-lg" style={{ background: a.grad }}>
              <Sparkles size={13} /> {t("Le plus populaire")}
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
    </div>
  );
}
