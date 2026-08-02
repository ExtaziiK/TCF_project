import { Shield, RotateCcw, CreditCard, Layers, Sparkles, Flame, Timer, BookOpen, LineChart } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell } from "@/components/common";
import { PricingPlans } from "@/components/pricing/PricingPlans";

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
import { usePricingSelection } from "@/hooks/usePricingSelection";

export function Pricing() {
  const { c, t } = useApp();
  // Shared with the landing page's pricing section. Owned here rather than
  // inside PricingPlans because the trust badges below read the currency too.
  const s = usePricingSelection();

  return (
    <PageShell back wide eyebrow={t("Abonnements")} title={t("Un forfait pour chaque étape de votre préparation")} sub={t("Payez en dollars américains, en toute sécurité via Stripe. Changez ou annulez à tout moment depuis votre tableau de bord.")}>
      <PricingPlans s={s} />
      <div className={`mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-center`}>
        {[{ icon: Shield, t: s.currency.code === "DZD" ? "Paiement local sécurisé" : "Paiement chiffré Stripe" }, { icon: RotateCcw, t: "Satisfait ou remboursé" }, { icon: CreditCard, t: "Sans engagement" }].map((b) => (
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
