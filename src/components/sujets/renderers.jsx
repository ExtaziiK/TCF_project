import { FileText, MessagesSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";

// Shared leaf renderers for the subject pages (Anciens sujets + Sujets
// d'actualité). EE = 3-task combinaisons; EO = tâches → parties → sujets.

// --- Expression écrite -----------------------------------------------------

function Task({ n, words, children }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} {n}</span>
        {words && <Pill tone="slate">{words}</Pill>}
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-line ${c.text}`}>{children}</p>
    </div>
  );
}

function TaskThree({ data }) {
  const { c, t } = useApp();
  const docs = [data?.doc1, data?.doc2].filter(Boolean);
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} 3</span>
        <Pill tone="amber"><MessagesSquare size={12} /> {t("Argumenter")}</Pill>
      </div>
      {data?.theme && <p className={`font-display font-bold ${c.text} mb-3`}>{data.theme}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map((doc, i) => (
          <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5"><FileText size={12} /> {t("Document")} {i + 1}</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{doc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// One combinaison card (three tasks a candidate may receive together).
export function EECombinaison({ s, i }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{s.n ?? i + 1}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Combinaison")} {s.n ?? i + 1}</h2>
      </div>
      <div className="space-y-5">
        {s.t1 && <Task n={1} words="60–120 mots">{s.t1}</Task>}
        {s.t2 && <><div className={`border-t ${c.border}`} /><Task n={2} words="120–150 mots">{s.t2}</Task></>}
        {s.t3 && <><div className={`border-t ${c.border}`} /><TaskThree data={s.t3} /></>}
      </div>
    </Card>
  );
}

// --- Expression orale ------------------------------------------------------

export const countEOSujets = (data) => (data || []).reduce((a, tk) => a + (tk.parties || []).reduce((b, p) => b + (p.sujets || []).length, 0), 0);
// Tâche 2 = jeu de rôle interactif, Tâche 3 = opinion argumentée.
const TACHE_LABEL = { 2: "Interaction", 3: "Expression d'un point de vue" };

export function EOTacheBlock({ tache }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{tache.tache}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Tâche")} {tache.tache}{TACHE_LABEL[tache.tache] ? ` · ${t(TACHE_LABEL[tache.tache])}` : ""}</h2>
      </div>
      <div className="space-y-4">
        {(tache.parties || []).map((p) => (
          <Card key={p.partie} className="p-5 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-3">{t("Partie")} {p.partie}</p>
            <ol className="space-y-3">
              {p.sujets.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${c.text}`}>{s}</p>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}
