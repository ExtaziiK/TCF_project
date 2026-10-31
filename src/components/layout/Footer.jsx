import { Shield, Mail, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink, SocialLinks } from "@/components/common";
import { CONTACT_EMAIL } from "@/constants/social";
import { Logo } from "@/components/layout/Logo";
import { canAccess, ROLES } from "@/auth/rbac";

// The site footer. Its columns follow the navigation as it now stands — the
// Épreuves hub, the Exercices notebook, the resources, then the company — and
// it shares the site's current look: neutral surfaces, colour kept for small
// accents and outlines.
//
// Columns are declared in full and filtered by the SAME canAccess the route
// guard uses, so an entry can never advertise a page its reader would be
// refused. Only entries that opt in with `gated: true` are checked — "La
// dictée" and friends deliberately stay visible to accounts that cannot yet
// open them, because the gate they land on is a sales page (or the log-in).
const COLS = [
  { h: "Épreuves", links: [["Compréhension orale", "listening"], ["Compréhension écrite", "reading"], ["Expression écrite", "writing"], ["Expression orale", "speaking"], ["TCF blanc", "mocks"]] },
  { h: "Exercices", links: [["La dictée", "dictee"], ["Vocabulaire", "vocabulary"], ["Grammaire", "grammar"], ["Conjugaison", "conjugation"], ["Carnet d'erreurs", "carnet", true], ["Révision", "revision", true]] },
  { h: "Ressources", links: [["Guide de l'examen", "guide"], ["Calculateur TCF → NCLC", "calculator"], ["Sujets du mois", "sujets-actualite"], ["Blog", "blog"], ["FAQ", "faq"]] },
  { h: "Passerelle", links: [["À propos", "about"], ["Avis", "avis"], ["Tarifs", "pricing"], ["Contact", "contact"]] },
];

// A flat Canadian flag, as in the landing page's collage.
function MiniFlag() {
  return (
    <svg viewBox="0 0 200 100" className="w-5 h-2.5 shrink-0" aria-hidden="true">
      <rect width="200" height="100" fill="#FFFFFF" />
      <rect width="50" height="100" fill="#D52B1E" />
      <rect x="150" width="50" height="100" fill="#D52B1E" />
      <path fill="#D52B1E" transform="translate(64 14) scale(0.72)"
        d="M50 3l8 17 9-5-3 25 15-12 4 8 12-2-6 15 6 5-22 16 4 10-23-4v22h-8V76l-23 4 4-10L5 54l6-5-6-15 12 2 4-8 15 12-3-25 9 5Z" />
    </svg>
  );
}

export function Footer() {
  const { c, t, role } = useApp();
  const visitor = role === ROLES.VISITOR;
  const chip = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${c.border} ${c.sub}`;
  return (
    <footer className={`border-t ${c.border} ${c.footer} mt-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-6">
        <div className="md:col-span-2">
          <Logo />
          <p className={`mt-4 text-sm leading-relaxed ${c.sub} max-w-xs`}>
            {t("La plateforme complète pour se préparer au TCF Canada : questions au format officiel, TCF blancs notés, correction par IA et suivi continu.")}
          </p>
          <RouteLink r={visitor ? "register" : "dashboard"}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition hover:gap-3"
            style={{ background: "linear-gradient(90deg,#2E6BE6,#D8354A)" }}>
            {t(visitor ? "Commencer gratuitement" : "Mon tableau de bord")} <ArrowRight size={15} />
          </RouteLink>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={chip}><Shield size={13} /> {t("Paiement sécurisé Stripe")}</span>
            <span className={chip}><MiniFlag /> {t("Fait au Canada")}</span>
          </div>
          {/* The follow strip sits under the brand block rather than in a link
              column: these are the only outbound links in the footer, and the
              columns are all in-app routes. */}
          <p className={`mt-6 text-xs font-semibold uppercase tracking-wide ${c.faint}`}>{t("Suivez-nous")}</p>
          <SocialLinks className="mt-2.5" />
          <a href={`mailto:${CONTACT_EMAIL}`} className={`mt-4 inline-flex items-center gap-1.5 text-sm ${c.sub} hover:text-blue-600 transition-colors`}>
            <Mail size={14} /> {CONTACT_EMAIL}
          </a>
        </div>
        {COLS.map((col) => (
          <div key={col.h}>
            <h3 className={`text-sm font-bold mb-4 ${c.text}`}>{t(col.h)}</h3>
            <ul className="space-y-2.5">
              {col.links.filter(([, r, gated]) => !gated || canAccess(role, r)).map(([l, r]) => (
                <li key={l}><RouteLink r={r} className={`text-sm ${c.sub} hover:text-blue-600 transition-colors link-anim`}>{t(l)}</RouteLink></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`border-t ${c.border}`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${c.faint}`}>
          <p>{t("© 2026 Passerelle. Plateforme indépendante — le TCF est une marque de France Éducation international.")}</p>
          {/* All four legal documents are real links — a visitor accepts the
              conditions when finishing their account and the policy is
              referenced from them, so both have to stay reachable afterwards. */}
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <RouteLink r="privacy" className="hover:text-blue-600 transition-colors">{t("Confidentialité")}</RouteLink>
            <RouteLink r="terms" className="hover:text-blue-600 transition-colors">{t("Conditions")}</RouteLink>
            <RouteLink r="accessibility" className="hover:text-blue-600 transition-colors">{t("Accessibilité")}</RouteLink>
            <RouteLink r="legal" className="hover:text-blue-600 transition-colors">{t("Mentions légales")}</RouteLink>
          </p>
        </div>
      </div>
    </footer>
  );
}
