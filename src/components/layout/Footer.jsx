import { Shield, Leaf } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Pill } from "@/components/common";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  const { c, nav, t } = useApp();
  const cols = [
    { h: "Pratique", links: [["Compréhension orale", "listening"], ["Compréhension écrite", "reading"], ["Expression écrite", "writing"], ["Expression orale", "speaking"], ["Examens blancs", "mocks"]] },
    { h: "Ressources", links: [["Guide de l'examen", "guide"], ["Vocabulaire", "vocabulary"], ["Grammaire", "grammar"], ["Blogue", "blog"], ["FAQ", "faq"]] },
    { h: "Passerelle", links: [["À propos", "about"], ["Tarifs", "pricing"], ["Contact", "contact"], ["Admin (démo)", "admin"]] },
  ];
  return (
    <footer className={`border-t ${c.border} ${c.footer} mt-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo onClick={() => nav("home")} />
          <p className={`mt-4 text-sm leading-relaxed ${c.sub} max-w-xs`}>{t("La plateforme de préparation au TCF Canada pensée pour votre projet d'immigration. Pratiquez, mesurez, réussissez.")}</p>
          <div className="mt-5 flex gap-2">
            <Pill tone="blue"><Shield size={12} /> {t("Paiement sécurisé Stripe")}</Pill>
            <Pill tone="red"><Leaf size={12} /> {t("Fait au Canada")}</Pill>
          </div>
        </div>
        {cols.map((col) => (
          <div key={col.h}>
            <h3 className={`text-sm font-bold mb-4 ${c.text}`}>{t(col.h)}</h3>
            <ul className="space-y-2.5">
              {col.links.map(([l, r]) => (
                <li key={l}><button onClick={() => nav(r)} className={`text-sm ${c.sub} hover:text-blue-600 transition-colors link-anim`}>{t(l)}</button></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`border-t ${c.border}`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${c.faint}`}>
          <p>{t("© 2026 Passerelle. Plateforme indépendante — le TCF est une marque de France Éducation international.")}</p>
          <p className="flex items-center gap-4"><span>{t("Confidentialité")}</span><span>{t("Conditions")}</span><span>{t("Accessibilité")}</span></p>
        </div>
      </div>
    </footer>
  );
}
