import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { WHY } from "@/constants/home";

export function About() {
  const { c } = useApp();
  return (
    <PageShell eyebrow="À propos" title="Une équipe entre deux continents, un seul objectif : votre réussite" sub="Passerelle est née à Montréal, fondée par des enseignants de FLE et d'anciens candidats au TCF Canada.">
      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <Card className="p-7">
          <h3 className={`font-display font-bold text-lg ${c.text} mb-3`}>Notre histoire</h3>
          <p className={`text-sm leading-relaxed ${c.sub}`}>En 2022, notre cofondatrice a raté son niveau cible de 8 points, faute de ressources fidèles au format de l'épreuve. Elle a réussi six mois plus tard — puis a bâti la plateforme qu'elle aurait voulu avoir. Aujourd'hui, plus de 12 000 candidats préparent leur test avec Passerelle, depuis 60 pays.</p>
        </Card>
        <Card className="p-7">
          <h3 className={`font-display font-bold text-lg ${c.text} mb-3`}>Notre méthode</h3>
          <p className={`text-sm leading-relaxed ${c.sub}`}>Chaque question est rédigée par un enseignant certifié, testée auprès de candidats réels, puis calibrée sur l'échelle CECR. Nos algorithmes mesurent vos réponses pour estimer votre niveau et prioriser ce qui vous rapportera le plus de points.</p>
        </Card>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WHY.map((w) => (
          <Card key={w.t} className="p-5">
            <w.icon size={20} className="text-blue-600 mb-3" />
            <p className={`font-semibold text-sm ${c.text}`}>{w.t}</p>
            <p className={`text-xs mt-1.5 leading-relaxed ${c.sub}`}>{w.d}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
