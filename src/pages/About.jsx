import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { WHY } from "@/constants/home";

export function About() {
  const { c, t } = useApp();
  return (
    <PageShell back eyebrow={t("À propos")} title={t("Un seul objectif : que vous arriviez prêt le jour du TCF")} sub={t("Une plateforme indépendante de préparation au TCF Canada, pensée pour les candidates et candidats à l'immigration.")}>
      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <Card className="p-7">
          <h3 className={`font-display font-bold text-lg ${c.text} mb-3`}>{t("Notre objectif")}</h3>
          <p className={`text-sm leading-relaxed ${c.sub}`}>{t("Le TCF Canada coûte cher à passer, et se préparer seul revient souvent à s'entraîner sur des documents qui ne ressemblent pas à l'épreuve. Passerelle existe pour combler ce manque : un entraînement fidèle au format réel, à un prix accessible, et qui vous dit honnêtement où vous en êtes. Notre seul objectif est que vous arriviez à l'examen sans mauvaise surprise.")}</p>
        </Card>
        <Card className="p-7">
          <h3 className={`font-display font-bold text-lg ${c.text} mb-3`}>{t("Notre méthode")}</h3>
          <p className={`text-sm leading-relaxed ${c.sub}`}>{t("Chaque question est rédigée par un enseignant certifié, testée auprès de candidats réels, puis calibrée sur l'échelle CECR. Nos algorithmes mesurent vos réponses pour estimer votre niveau et prioriser ce qui vous rapportera le plus de points.")}</p>
        </Card>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WHY.map((w) => (
          <Card key={w.t} className="p-5">
            <w.icon size={20} className="text-blue-600 mb-3" />
            <p className={`font-semibold text-sm ${c.text}`}>{t(w.t)}</p>
            <p className={`text-xs mt-1.5 leading-relaxed ${c.sub}`}>{t(w.d)}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
