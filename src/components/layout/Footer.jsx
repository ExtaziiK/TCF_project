import { Shield, Leaf, Mail } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Pill, RouteLink, SocialLinks } from "@/components/common";
import { CONTACT_EMAIL } from "@/constants/social";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  const { c, t } = useApp();
  const cols = [
    { h: "Pratique", links: [["Compréhension orale", "listening"], ["Compréhension écrite", "reading"], ["Expression écrite", "writing"], ["Expression orale", "speaking"], ["TCF blanc", "mocks"]] },
    { h: "Ressources", links: [["Guide de l'examen", "guide"], ["Sujets d'actualité", "sujets-actualite"], ["Vocabulaire", "vocabulary"], ["Grammaire", "grammar"], ["Blogue", "blog"], ["FAQ", "faq"]] },
    { h: "Passerelle", links: [["À propos", "about"], ["Tarifs", "pricing"], ["Contact", "contact"]] },
  ];
  return (
    <footer className={`border-t ${c.border} ${c.footer} mt-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className={`mt-4 text-sm leading-relaxed ${c.sub} max-w-xs`}>{t("La plateforme de préparation au TCF Canada pensée pour votre projet d'immigration. Pratiquez, mesurez, réussissez.")}</p>
          <div className="mt-5 flex gap-2">
            <Pill tone="blue"><Shield size={12} /> {t("Paiement sécurisé Stripe")}</Pill>
            <Pill tone="red"><Leaf size={12} /> {t("Fait au Canada")}</Pill>
          </div>
          {/* The follow strip sits under the brand block rather than in a link
              column: these are the only outbound links in the footer, and the
              columns below are all in-app routes. */}
          <p className={`mt-6 text-xs font-semibold uppercase tracking-wide ${c.faint}`}>{t("Suivez-nous")}</p>
          <SocialLinks className="mt-2.5" />
          <a href={`mailto:${CONTACT_EMAIL}`} className={`mt-4 inline-flex items-center gap-1.5 text-sm ${c.sub} hover:text-blue-600 transition-colors`}>
            <Mail size={14} /> {CONTACT_EMAIL}
          </a>
        </div>
        {cols.map((col) => (
          <div key={col.h}>
            <h3 className={`text-sm font-bold mb-4 ${c.text}`}>{t(col.h)}</h3>
            <ul className="space-y-2.5">
              {col.links.map(([l, r]) => (
                <li key={l}><RouteLink r={r} className={`text-sm ${c.sub} hover:text-blue-600 transition-colors link-anim`}>{t(l)}</RouteLink></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`border-t ${c.border}`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${c.faint}`}>
          <p>{t("© 2026 Passerelle. Plateforme indépendante — le TCF est une marque de France Éducation international.")}</p>
          {/* Both legal documents are real links — a visitor accepts the
              conditions at signup and the policy is referenced from them, so
              both have to stay reachable afterwards. "Accessibilité" is still a
              label: that page doesn't exist yet. */}
          <p className="flex items-center gap-4">
            <RouteLink r="privacy" className="hover:text-blue-600 transition-colors">{t("Confidentialité")}</RouteLink>
            <RouteLink r="terms" className="hover:text-blue-600 transition-colors">{t("Conditions")}</RouteLink>
            <span>{t("Accessibilité")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
