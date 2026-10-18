import { useState } from "react";
import { Shield, RotateCcw, CreditCard, Layers, Sparkles, Flame, Timer, BookOpen, LineChart, Headphones, ChevronDown, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, RouteLink } from "@/components/common";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { usePricingSelection } from "@/hooks/usePricingSelection";
import { useIsAlgeria } from "@/hooks/useIsAlgeria";
import { FAQS } from "@/constants/faq";

// The Tarifs page: the passes as tickets (PricingPlans → PlanCard), then a
// trust band, what every pass includes, and the pricing questions from the FAQ.

// Everything the platform offers — the value behind every pass. Titles and
// descriptions go through t() (French source, English in the dictionary).
const WEBSITE_FEATURES = [
  { icon: Layers, t: "Les 4 épreuves officielles", d: "Compréhension orale et écrite, expression orale et écrite : des quiz réalistes calqués sur le vrai TCF Canada." },
  { icon: Sparkles, t: "Correction par intelligence artificielle", d: "Vos expressions écrite et orale évaluées en quelques secondes : niveau CECR estimé, points forts, pistes d'amélioration et version réécrite de votre texte." },
  { icon: Flame, t: "Sujets EE/EO du mois", d: "Les sujets d'expression écrite et orale les plus fréquents du moment, actualisés chaque mois pour coller aux sessions récentes." },
  { icon: Timer, t: "TCF blancs chronométrés", d: "L'examen complet en conditions réelles, minuté épreuve par épreuve, pour vous entraîner comme le jour J." },
  { icon: BookOpen, t: "Vocabulaire et grammaire", d: "Cartes mémoire thématiques et leçons de grammaire ciblées pour consolider vos bases." },
  // Premium (rbac.js → dictee: PREMIUM). It stays in this list because the list
  // describes what the PLATFORM offers, which is the value behind every paid
  // pass — the tiers that actually grant it are listed on the tickets above.
  { icon: Headphones, t: "La dictée", d: "Un corrigé de niveau C1 ou C2 lu à voix haute, que vous écrivez sans texte ni correcteur. Vous choisissez la longueur lue d'un coup, et le rapport final sépare ce que vous n'avez pas entendu de ce que vous avez mal orthographié." },
  { icon: LineChart, t: "Suivi et score estimé", d: "Votre progression enregistrée et un calculateur de score TCF / NCLC pour situer votre niveau à tout moment." },
];

// The pricing questions, taken from the FAQ (constants/faq.js), whose answers
// are kept true of the product — no claim is made here that the FAQ doesn't.
const PRICING_FAQ = ["gratuit-ou-forfait", "renouvellement", "code-promo", "paiement-ccp-baridimob"];

function FaqItem({ f }) {
  const { c, t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b ${c.border} last:border-b-0`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left">
        <span className={`font-semibold text-sm sm:text-base ${c.text}`}>{t(f.q)}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180 text-blue-600" : c.faint}`} />
      </button>
      {open && (
        <div className="pb-4 rise">
          <p className={`text-sm leading-relaxed ${c.sub}`}>{t(f.a)}</p>
          {f.steps && (
            <ol className={`mt-3 space-y-1.5 text-sm ${c.sub} list-decimal pl-5`}>
              {f.steps.map((s) => <li key={s}>{t(s)}</li>)}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export function Pricing() {
  const { c, t } = useApp();
  // Shared with the landing page's pricing section. Owned here rather than
  // inside PricingPlans because the trust band below reads the currency too.
  const s = usePricingSelection();
  const dz = useIsAlgeria();
  const faqs = PRICING_FAQ.map((id) => FAQS.find((f) => f.id === id)).filter((f) => f && (!f.dzOnly || dz));
  const trust = [
    { icon: Shield, t: s.currency.code === "DZD" ? "Paiement local sécurisé" : "Paiement chiffré Stripe" },
    { icon: RotateCcw, t: "Satisfait ou remboursé" },
    { icon: CreditCard, t: "Sans engagement" },
  ];

  return (
    <PageShell back wide center eyebrow={t("Tarifs")} title={t("Choisissez votre pass")}
      sub={t("Un paiement unique, sans renouvellement automatique. Commencez gratuitement, passez au pass qui vous convient quand vous voulez.")}>
      <PricingPlans s={s} />

      {/* Trust band: one strip, three reassurances. */}
      <Card className="mt-12 max-w-3xl mx-auto grid sm:grid-cols-3">
        {trust.map((b, i) => (
          <div key={b.t} className={`flex items-center justify-center gap-2.5 px-5 py-4 ${i ? `border-t sm:border-t-0 sm:border-l ${c.border}` : ""}`}>
            <b.icon size={18} className="text-blue-600 shrink-0" />
            <p className={`text-sm font-semibold ${c.text}`}>{t(b.t)}</p>
          </div>
        ))}
      </Card>

      {/* What every pass includes: heading on the left, the list on the right. */}
      <div className="mt-20 max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-start">
        <div className="lg:sticky lg:top-28 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Inclus dans chaque pass")}</p>
          <h2 className={`mt-2 font-display font-extrabold text-2xl sm:text-3xl ${c.text}`}>{t("Tout pour réussir le TCF Canada, au même endroit")}</h2>
          <p className={`mt-3 text-sm leading-relaxed ${c.sub}`}>{t("Passerelle couvre les quatre épreuves officielles et vous entraîne en conditions réelles, avec une correction par IA et des sujets remis à jour chaque mois.")}</p>
          <RouteLink r="exams" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:gap-2.5 transition-all">
            {t("Essayer gratuitement")} <ArrowRight size={15} />
          </RouteLink>
        </div>
        <Card className="p-2 sm:p-3">
          {WEBSITE_FEATURES.map((f, i) => (
            <div key={f.t} className={`flex gap-4 p-4 text-left ${i ? `border-t ${c.border}` : ""}`}>
              <span className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><f.icon size={18} /></span>
              <div className="min-w-0">
                <h3 className={`font-display font-bold text-sm ${c.text}`}>{t(f.t)}</h3>
                <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{t(f.d)}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* The pricing questions. */}
      {faqs.length > 0 && (
        <div className="mt-20 max-w-3xl mx-auto text-left">
          <h2 className={`font-display font-extrabold text-2xl text-center ${c.text}`}>{t("Questions fréquentes")}</h2>
          <Card className="mt-6 px-5 sm:px-6">
            {faqs.map((f) => <FaqItem key={f.id} f={f} />)}
          </Card>
          <div className="mt-4 text-center">
            <RouteLink r="faq" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
              {t("Toutes les questions")} <ArrowRight size={14} />
            </RouteLink>
          </div>
        </div>
      )}
    </PageShell>
  );
}
