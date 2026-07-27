import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { startCheckout, promoLabel } from "@/services/stripeService";
import { setDzCheckoutPlan } from "@/utils/dzCheckout";

// Accents grade along the brand gradient, from blue up through red, then gold
// for the top VIP tier. `grad` drives the price text, the "popular" badge and
// the CTA; `solid` drives the eyebrow, border, checks and the hover glow.
// (Inline styles, so the ramp isn't tied to a Tailwind palette.)
export const ACCENTS = {
  blue: { solid: "#2E6BE6", grad: "linear-gradient(135deg,#2E6BE6,#5f93f2)" },
  violet: { solid: "#6C4FE0", grad: "linear-gradient(135deg,#6C4FE0,#9a83f2)" },
  rose: { solid: "#A8407C", grad: "linear-gradient(135deg,#A8407C,#cf6ba3)" },
  red: { solid: "#D8354A", grad: "linear-gradient(135deg,#D8354A,#ef6f7e)" },
  gold: { solid: "#b8860b", grad: "linear-gradient(135deg,#b8860b,#f6d365)" },
};

// Bold the numbers in a line (digits only — a light touch) so quantities, and
// especially how long the pass is valid, read at a glance.
const NUM = /(\d+(?:[.,]\d+)?)/g;
function boldNumbers(text, cls) {
  return text.split(NUM).map((part, i) => (/^\d/.test(part) ? <strong key={i} className={cls}>{part}</strong> : part || null));
}

// The shown price is a launch offer at 50% off; the crossed-out "before" price
// is simply double it. Doubles the numeric part while keeping whatever currency
// formatting the string already carries ("$4.99" → "$9.98"). Null for free/$0.
function beforePrice(price) {
  const m = String(price).match(/\d+([.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  if (!n) return null;
  const doubled = n * 2;
  return price.replace(m[0], Number.isInteger(doubled) ? String(doubled) : doubled.toFixed(2));
}

// Applies a validated promo to the plan price so the page can preview what the
// user will actually be charged, keeping the string's currency formatting
// ("$4.99" → "$3.99"). percent_off is exact; amount_off is subtracted in whole
// currency units (Stripe stores it in cents). Null when there's no discount.
function discounted(price, promo) {
  if (!promo) return null;
  const m = String(price).match(/\d+([.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  if (!n) return null;
  let value;
  if (promo.percentOff) value = n * (1 - promo.percentOff / 100);
  else if (promo.amountOff) value = Math.max(0, n - promo.amountOff / 100);
  else return null;
  const rounded = Math.round(value * 100) / 100;
  if (rounded === n) return null;
  return price.replace(m[0], Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2));
}

export function PlanCard({ p, compact, promo, index = 0, currency }) {
  const { c, nav, user, notify, t } = useApp();
  const [busy, setBusy] = useState(false);
  // DZD is paid on-site (CCP / BaridiMob), never through Stripe.
  const isDzd = currency?.code === "DZD";
  const a = ACCENTS[p.accent] || ACCENTS.blue;
  const paid = !!p.priceId;
  const oldPrice = paid ? beforePrice(p.price) : null;
  // With a promo applied, preview the post-discount price: it becomes the big
  // number, the (pre-promo) plan price is struck through, and the launch −50 %
  // marketing badge is replaced by the promo's own discount label.
  const promoPrice = paid ? discounted(p.price, promo) : null;
  const mainPrice = promoPrice || p.price;
  const struckPrice = promoPrice ? p.price : oldPrice;
  const priceBadge = promoPrice ? promoLabel(promo) : (oldPrice ? "−50 %" : null);

  const subscribe = async () => {
    if (!user) { notify(t("Créez un compte gratuit pour vous abonner.")); return nav("register"); }
    // Algerian dinar: hand off to the on-site manual-payment page instead of Stripe.
    if (isDzd) { setDzCheckoutPlan(p.name); return nav("checkout-dz"); }
    setBusy(true);
    try {
      await startCheckout(p.priceId, promo?.code);
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
          <p className="mt-3 flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
            <span key={mainPrice} className="metal-text font-display font-extrabold text-4xl rise" style={gradText}>{mainPrice}</span>
            {struckPrice && <span className={`text-base font-semibold line-through ${c.faint}`}>{struckPrice}</span>}
            <span className={`text-sm ${c.faint}`}>{boldNumbers(t(p.per), `font-bold ${c.text}`)}</span>
          </p>
          {priceBadge && (
            <p className="mt-1.5">
              <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">{priceBadge}</span>
            </p>
          )}
          <ul className="mt-6 space-y-3 flex-1">
            {p.feats.slice(0, compact ? 4 : 99).map((f) => (
              <li key={f} className={`flex gap-2.5 text-sm ${c.sub}`}>
                <Check size={16} color={a.solid} className="shrink-0 mt-0.5" />
                <span>{boldNumbers(t(f), `font-bold ${c.text}`)}</span>
              </li>
            ))}
          </ul>
          <Btn
            // Fixed height + tight leading so one- and two-line labels
            // (e.g. "Choisir Première classe") render at exactly the same size —
            // a min-height wouldn't, since the button's padding grows the
            // wrapping ones past it.
            className="mt-7 w-full h-14 !py-0 leading-tight text-center"
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
