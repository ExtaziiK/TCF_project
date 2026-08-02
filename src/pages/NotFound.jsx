import { useState } from "react";
import { Compass, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn, RouteLink } from "@/components/common";

// The 404 page, rendered for any URL that matches no route (see
// routeFromPath in src/constants/seo.js). Two jobs: tell the visitor the
// address is wrong instead of dropping them on the homepage with no
// explanation, and offer real routes out. The head is set to noindex by
// applyRouteMeta, which — together with the wording below — is what a crawler
// reads as "this is an error page", since the host still answers 200.
const SUGGESTIONS = [
  { r: "guide", t: "Guide du TCF Canada", d: "Le format des quatre épreuves, le barème et les niveaux." },
  { r: "practice", t: "Pratique gratuite", d: "Un quiz offert dans chaque épreuve, au format officiel." },
  { r: "pricing", t: "Tarifs", d: "Les forfaits et ce que débloque l'accès Premium." },
  { r: "blog", t: "Blog", d: "Conseils de préparation et repères pour l'immigration." },
];

export function NotFound() {
  const { c, nav, t } = useApp();
  // Captured once: the URL that failed. It stays in the address bar (the
  // history sync never rewrites it), and echoing it here makes a typo or a
  // truncated link obvious at a glance.
  const [path] = useState(() => window.location.pathname);

  return (
    <PageShell
      eyebrow={t("Erreur 404")}
      title={t("Cette page est introuvable")}
      sub={t("L'adresse demandée n'existe pas ou la page a été déplacée. Vérifiez le lien, ou repartez d'une des pages ci-dessous.")}
    >
      <Card className="max-w-2xl mx-auto p-8 text-center">
        <span className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto">
          <Compass size={22} />
        </span>
        <p className={`mt-4 text-sm ${c.sub}`}>{t("Adresse demandée :")}</p>
        <p className={`mt-1 font-mono text-sm break-all ${c.text}`}>{path}</p>
        <div className="mt-6 flex justify-center">
          <Btn icon={ArrowRight} onClick={() => nav("home")}>{t("Retour à l'accueil")}</Btn>
        </div>
      </Card>

      {/* Real <a href> links (RouteLink), so the crawler that landed here still
          finds its way to the indexable pages. */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {SUGGESTIONS.map((s) => (
          <RouteLink key={s.r} r={s.r} className="block">
            <Card lift className="h-full p-5">
              <p className={`font-semibold text-sm ${c.text}`}>{t(s.t)}</p>
              <p className={`text-sm mt-1 ${c.sub}`}>{t(s.d)}</p>
            </Card>
          </RouteLink>
        ))}
      </div>
    </PageShell>
  );
}
