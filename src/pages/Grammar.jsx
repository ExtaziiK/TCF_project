import { useState } from "react";
import { ChevronLeft, BookOpen, PenLine, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { GrammarExercise } from "@/components/grammar/GrammarExercise";
import { GRAMMAR_TOPICS } from "@/constants/grammar";

export function Grammar() {
  const { c } = useApp();
  const [topicId, setTopicId] = useState(null);
  const topic = GRAMMAR_TOPICS.find((t) => t.id === topicId);
  if (topic) {
    return (
      <PageShell eyebrow="Grammaire" title={topic.t} sub={topic.d}>
        <button onClick={() => setTopicId(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> Tous les sujets</button>
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-7">
            <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${c.text}`}><BookOpen size={18} className="text-blue-600" /> La leçon</h3>
            <ul className="space-y-4">
              {topic.lesson.map((l, i) => (
                <li key={i} className={`flex gap-3 text-sm leading-relaxed ${c.sub}`}>
                  <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 text-xs font-mono2 font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>{l}
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-4">
            <h3 className={`font-display font-bold flex items-center gap-2 ${c.text}`}><PenLine size={18} className="text-rose-600" /> À vous de jouer</h3>
            {topic.qs.map((q) => <GrammarExercise key={q.q} q={q} />)}
          </div>
        </div>
      </PageShell>
    );
  }
  return (
    <PageShell wide eyebrow="Grammaire" title="Des leçons courtes, des exercices immédiats" sub="Chaque sujet se termine par des exercices corrigés. Dix minutes par leçon, pas plus.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GRAMMAR_TOPICS.map((t, i) => (
          <button key={t.id} onClick={() => setTopicId(t.id)} className="text-left">
            <Card lift className="p-6 h-full">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 font-mono2 font-bold flex items-center justify-center">{String(i + 1).padStart(2, "0")}</span>
                <Pill tone="slate">{t.qs.length} exercice{t.qs.length > 1 ? "s" : ""}</Pill>
              </div>
              <h3 className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t.t}</h3>
              <p className={`mt-1.5 text-sm ${c.sub}`}>{t.d}</p>
              <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1">Ouvrir la leçon <ArrowRight size={14} /></p>
            </Card>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
