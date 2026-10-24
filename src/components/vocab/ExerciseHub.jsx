import { useState } from "react";
import { Target, Link2, Puzzle, Shirt, Languages, GitBranch, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { ChoiceExercise } from "@/components/vocab/ChoiceExercise";
import { MOT_PRECIS } from "@/constants/vocab/motPrecis";
import { CONNECTEURS, RELATIONS } from "@/constants/vocab/connecteurs";
import { COLLOCATIONS } from "@/constants/vocab/collocations";
import { REGISTRE } from "@/constants/vocab/registre";
import { FAUX_AMIS } from "@/constants/vocab/fauxAmis";
import { FAMILLES } from "@/constants/vocab/familles";

// The vocabulary exercises, one card each. The first two target the criteria
// the Expression grids score most directly (lexique, cohérence); the others
// build the range those criteria reward. Every wrong answer goes to
// « Mon lexique ».
export const EXERCISES = [
  { id: "precis", source: "mot-precis", icon: Target, title: "Le mot précis", tag: "Lexique", desc: "Remplacez le mot vague (chose, faire, il y a, beaucoup) par l’expression précise.", question: "Quelle expression remplace le mieux le passage souligné ?", items: MOT_PRECIS },
  { id: "connecteurs", source: "connecteur", icon: Link2, title: "Les connecteurs", tag: "Cohérence", desc: "Choisissez le connecteur selon la relation entre les idées : opposition, cause, condition…", question: "Quel connecteur convient ?", items: CONNECTEURS, relations: RELATIONS },
  { id: "collocations", source: "collocation", icon: Puzzle, title: "Les collocations", tag: "Lexique", desc: "Le verbe qui va avec le nom : prendre une décision, poser une question, porter plainte.", question: "Quel verbe complète la phrase ?", items: COLLOCATIONS },
  { id: "registre", source: "registre", icon: Shirt, title: "Le registre", tag: "Adéquation", desc: "Passez du familier (boulot, bagnole, j’ai pas) au registre attendu à l’écrit.", question: "Quelle formulation convient à l’écrit ?", items: REGISTRE },
  { id: "faux-amis", source: "faux-ami", icon: Languages, title: "Les faux amis", tag: "Sens", desc: "Les mots qui ressemblent à l’anglais mais n’ont pas le même sens : éventuellement, librairie…", question: "Dans cette phrase, que signifie le mot en bleu ?", items: FAUX_AMIS },
  { id: "familles", source: "famille", icon: GitBranch, title: "Les familles de mots", tag: "Variété", desc: "Du verbe au nom, de l’adjectif à l’adverbe : décider, décision, décisif.", question: "Quelle forme du mot entre parenthèses convient ?", items: FAMILLES },
];

export function ExerciseHub() {
  const { c, t } = useApp();
  const [open, setOpen] = useState(null);
  const ex = EXERCISES.find((x) => x.id === open);

  if (ex) {
    return (
      <div>
        <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => setOpen(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={15} /> {t("Tous les exercices")}
          </button>
          <span className={`text-sm ${c.sub}`}>· {t(ex.title)}</span>
        </div>
        <p className={`max-w-2xl mx-auto text-sm mb-5 ${c.sub}`}>{t(ex.desc)}</p>
        <ChoiceExercise key={ex.id} items={ex.items} source={ex.source} question={ex.question} relations={ex.relations || null} />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {EXERCISES.map((x) => {
        const Icon = x.icon;
        return (
          <button key={x.id} type="button" onClick={() => setOpen(x.id)} className="text-left">
            <Card className="p-5 h-full card-lift hover:border-blue-600/50 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center"><Icon size={18} /></span>
                <Pill tone="slate">{t(x.tag)}</Pill>
              </div>
              <p className={`font-display font-bold ${c.text}`}>{t(x.title)}</p>
              <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{t(x.desc)}</p>
              <p className={`mt-3 text-xs font-semibold ${c.faint}`}>{x.items.length} {t("phrases")}</p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
