import { Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";

// Shown above the two Expression workshops to a free account.
//
// Free accounts reach these workshops on ONE fixed subject with two AI analyses
// per tâche. Both limits need saying up front: the subject never rotating looks
// like a bug otherwise, and a candidate who spends both analyses on a draft has
// no way to know why the button stopped working.
export function FreeExpressionNotice({ section }) {
  const { c, t, nav } = useApp();
  const label = section === "ee" ? t("expression écrite") : t("expression orale");

  return (
    <Card className="p-5 mb-6 border-2 border-blue-600/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className={`text-sm font-semibold ${c.text}`}>
            {t(`Votre sujet d'${label} gratuit`)}
          </p>
          <p className={`text-sm mt-1 ${c.sub}`}>
            {t("Votre compte gratuit donne accès à ce sujet, identique à chaque visite, avec 2 analyses IA par tâche. Premium débloque tous les sujets du mois, la rotation complète et les analyses illimitées.")}
          </p>
        </div>
        <Btn variant="accent" icon={Crown} onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
      </div>
    </Card>
  );
}
