import { useApp } from "@/context/AppContext";
import { PageShell } from "@/components/common";
import { ScoreCalculator } from "@/components/calculator/ScoreCalculator";

// Public route (/calculator) reached from the navbar. The same calculator is
// also embedded on the signed-out landing page.
export function Calculator() {
  const { t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Calculateur")}
      title={t("Convertissez vos scores TCF Canada en niveaux NCLC")}
      sub={t("Entrez vos scores aux quatre épreuves pour connaître vos niveaux NCLC et CECRL, et vérifier les seuils de votre projet d'immigration.")}
    >
      <div className="max-w-2xl mx-auto">
        <ScoreCalculator />
      </div>
    </PageShell>
  );
}
