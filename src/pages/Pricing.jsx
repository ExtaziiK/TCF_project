import { useEffect, useMemo, useState } from "react";
import { Gift, CheckCircle2, Shield, RotateCcw, CreditCard, XCircle, Layers, Sparkles, Flame, Timer, BookOpen, LineChart } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PlanCard } from "@/components/pricing/PlanCard";

// Everything the platform offers, summarised below the plans so visitors see
// the value behind the prices. Titles/descriptions go through t() like the rest
// of the page (French source, English in the dictionary).
const WEBSITE_FEATURES = [
  { icon: Layers, t: "Les 4 épreuves officielles", d: "Compréhension orale et écrite, expression orale et écrite : des quiz réalistes calqués sur le vrai TCF Canada." },
  { icon: Sparkles, t: "Correction par intelligence artificielle", d: "Vos expressions écrite et orale évaluées en quelques secondes : niveau CECR estimé, points forts, pistes d'amélioration et version réécrite de votre texte." },
  { icon: Flame, t: "Sujets EE/EO du mois", d: "Les sujets d'expression écrite et orale les plus fréquents du moment, actualisés chaque mois pour coller aux sessions récentes." },
  { icon: Timer, t: "TCF blancs chronométrés", d: "L'examen complet en conditions réelles, minuté épreuve par épreuve, pour vous entraîner comme le jour J." },
  { icon: BookOpen, t: "Vocabulaire et grammaire", d: "Cartes mémoire thématiques et leçons de grammaire ciblées pour consolider vos bases." },
  { icon: LineChart, t: "Suivi et score estimé", d: "Votre progression enregistrée et un calculateur de score TCF / NCLC pour situer votre niveau à tout moment." },
];
import { useLivePlans } from "@/hooks/useLivePlans";
import { validatePromoCode, promoLabel } from "@/services/stripeService";
import { CURRENCIES, convertPrice, planDzdAmount } from "@/utils/currency";
import { getPaymentDz } from "@/services/settingsService";

export function Pricing() {
  const { c, t } = useApp();
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

  // Prices are stored/charged in USD; this rewrites the displayed figure into
  // the visitor's currency. For DZD, the owner's explicit price wins (falling
  // back to the auto-converted amount); other currencies are indicative
  // conversions. PlanCard's −50 % and promo math still run on the string.
  // DZD is paid by manual transfer, so a Stripe coupon can only be honoured
  // when it is a percentage — that arithmetic works on any currency. A
  // fixed-amount USD coupon is dropped for DZD and explained below.
  const isDzd = currency.code === "DZD";
  const dzUsablePromo = isDzd ? (applied?.percentOff ? applied : null) : applied;

  const displayPlans = useMemo(
    () => plans.map((p) => ({
      ...p,
      price: currency.code === "DZD" ? planDzdAmount(p, dzPrices) : convertPrice(p.price, currency),
    })),
    [plans, currency, dzPrices]
  );

  // Real validation against Stripe (api/promo-validate); the applied code is
  // then attached to the Checkout session, so the discount the user sees here
  // is exactly what Stripe charges.
  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setChecking(true);
    setCouponError("");
    const r = await validatePromoCode(code);
    setChecking(false);
    if (!r.valid) {
      setApplied(null);
      setCouponError(r.unavailable ? t("Vérification indisponible ici (fonctions serverless non déployées).") : t("Ce code n'est pas valide, a expiré ou a atteint sa limite d'utilisation."));
      return;
    }
    setApplied(r);
  };

  return (
    <PageShell back wide eyebrow={t("Abonnements")} title={t("Un forfait pour chaque étape de votre préparation")} sub={t("Payez en dollars américains, en toute sécurité via Stripe. Changez ou annulez à tout moment depuis votre tableau de bord.")}>
      {/* Currency switch — indicative conversion only; Stripe still charges USD. */}
      <div className={`flex justify-center ${currency.code === "EUR" ? "mb-8" : ""}`}>
        <div className={`inline-flex items-center gap-1 p-1.5 rounded-full border shadow-sm ${c.border} ${c.card}`} role="group" aria-label={t("Afficher les prix dans une autre devise")}>
          {CURRENCIES.map((cur) => {
            const active = cur.code === currency.code;
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => setCurrency(cur)}
                aria-pressed={active}
                className={`px-4 py-2 rounded-full text-sm font-bold transition ${active ? "text-white shadow" : `text-blue-600 ${c.hoverSoft}`}`}
                style={active ? { background: "linear-gradient(135deg,#2E6BE6,#5f93f2)" } : undefined}
              >
                {t(cur.label)}
              </button>
            );
          })}
        </div>
      </div>
      {currency.code !== "EUR" && (
        <p className={`text-center text-xs mt-3 mb-8 ${c.faint}`}>
          {currency.code === "USD"
            ? t("Tous les paiements sont effectués en dollars US (USD).")
            : t("Paiement en dinar algérien par CCP ou BaridiMob, avec activation après vérification du reçu.")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-7xl mx-auto">
        {displayPlans.map((p, i) => <PlanCard key={p.name} p={p} promo={dzUsablePromo} index={i} currency={currency} />)}
      </div>
      <Card className="mt-10 max-w-xl mx-auto p-6">
        <p className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}><Gift size={16} className="text-rose-600" /> {t("Vous avez un code promo ?")}</p>
        <div className="flex gap-2">
          <input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setApplied(null); setCouponError(""); }} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} placeholder={t("Ex. : BIENVENUE20")} aria-label={t("Code promo")} className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-mono2 outline-none focus:border-blue-600 ${c.inputCls}`} />
          <Btn small disabled={checking || !coupon.trim()} onClick={applyCoupon}>{t(checking ? "Vérification…" : "Appliquer")}</Btn>
        </div>
        {applied && (
          <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5 rise">
            <CheckCircle2 size={15} /> {applied.code} : {promoLabel(applied)} {t(applied.duration === "forever" ? "sur tous les paiements" : applied.duration === "repeating" ? `pendant ${applied.durationInMonths} mois` : "sur le premier paiement")} — {t("appliqué automatiquement au paiement.")}
          </p>
        )}
        {couponError && <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5"><XCircle size={15} /> {couponError}</p>}
        {/* A fixed-amount Stripe coupon is priced in USD; there is no honest way
            to subtract it from a dinar total, so say so rather than show a
            discount the manual payment will not honour. */}
        {isDzd && applied && !applied.percentOff && (
          <p className="mt-3 text-sm text-amber-600 flex items-start gap-1.5">
            <XCircle size={15} className="shrink-0 mt-0.5" /> {t("Ce code est un montant fixe en dollars : il ne peut pas s'appliquer à un paiement en dinars. Seuls les codes en pourcentage sont acceptés ici.")}
          </p>
        )}
      </Card>
      <div className={`mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-center`}>
        {[{ icon: Shield, t: currency.code === "DZD" ? "Paiement local sécurisé" : "Paiement chiffré Stripe" }, { icon: RotateCcw, t: "Satisfait ou remboursé" }, { icon: CreditCard, t: "Sans engagement" }].map((b) => (
          <div key={b.t} className={`p-4 rounded-2xl border ${c.border} ${c.card} flex flex-col items-center gap-2`}>
            <b.icon size={20} className="text-blue-600" /><p className={`text-sm font-medium ${c.sub}`}>{t(b.t)}</p>
          </div>
        ))}
      </div>

      {/* What the platform includes — the value behind every plan. */}
      <div className="mt-16 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className={`font-display font-extrabold text-2xl sm:text-3xl ${c.text}`}>{t("Tout pour réussir le TCF Canada, au même endroit")}</h2>
          <p className={`mt-3 text-sm ${c.sub}`}>{t("Passerelle couvre les quatre épreuves officielles et vous entraîne en conditions réelles, avec une correction par IA et des sujets remis à jour chaque mois.")}</p>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEBSITE_FEATURES.map((f) => (
            <div key={f.t} className={`p-5 rounded-2xl border ${c.border} ${c.card}`}>
              <span className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center"><f.icon size={18} /></span>
              <h3 className={`mt-3 font-display font-bold text-sm ${c.text}`}>{t(f.t)}</h3>
              <p className={`mt-1.5 text-sm ${c.sub}`}>{t(f.d)}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
