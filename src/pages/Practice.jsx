import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { FEATURES } from "@/constants/home";

export function Practice() {
  const { c, nav } = useApp();
  return (
    <PageShell wide eyebrow="Pratique gratuite" title="Essayez chaque module, sans compte ni carte" sub="10 questions gratuites par jour et par module. Créez un compte pour sauvegarder votre progression.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <button key={f.t} onClick={() => nav(f.route)} className="text-left">
            <Card lift className="p-6 h-full">
              <div className="flex items-start justify-between">
                <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/25"><f.icon size={22} /></span>
                <Pill tone="green">Gratuit</Pill>
              </div>
              <h3 className={`font-display font-bold text-lg mt-5 ${c.text}`}>{f.t}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{f.d}</p>
              <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1">Essayer maintenant <ArrowRight size={14} /></p>
            </Card>
          </button>
        ))}
      </div>
      <Card className="mt-8 p-6 text-center border-2 border-blue-600/40">
        <p className={`font-display font-bold text-lg ${c.text}`}>Envie de tout débloquer ?</p>
        <p className={`text-sm mt-1 ${c.sub}`}>Questions illimitées, examens blancs complets et analyse IA dès 19 $ / mois.</p>
        <div className="mt-4 flex justify-center gap-3"><Btn small variant="accent" onClick={() => nav("pricing")}>Voir les forfaits</Btn></div>
      </Card>
    </PageShell>
  );
}
