import { FileText, MessagesSquare, Sparkles, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, RouteLink } from "@/components/common";
import { hasAnswer } from "@/services/sujetsAnswersService";

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

// Offer to open the model answer for this combinaison. Shown to EVERYONE, not
// just subscribers: it is what tells a visitor the corrigés exist. The page
// behind it is Premium (PAGE_ACCESS in src/auth/rbac.js), so a free account
// lands on the upgrade pitch rather than on the text.
//
// Not hover-only. `opacity` lifts on hover for the pointer case, but the link
// stays in the layout and fully reachable at all times — a hover-gated control
// is invisible on touch, and most of this site's traffic is on a phone.
function AnswerCta({ year, monthNum, n }) {
  const { c, t } = useApp();
  const route = `sujet-reponse/${year}-${String(monthNum).padStart(2, "0")}/${n}`;
  return (
    <RouteLink
      r={route}
      className={`mt-5 flex items-center gap-2.5 rounded-2xl border border-blue-600/30 bg-blue-600/[0.06] px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 transition-all md:opacity-80 md:group-hover:opacity-100 md:group-hover:border-blue-600/60 hover:bg-blue-600/10 ${c.hoverSoft}`}
    >
      <Sparkles size={15} className="shrink-0" />
      <span className="flex-1">{t("Voir un modèle de réponse pour cette combinaison")}</span>
      <ArrowRight size={15} className="shrink-0 transition-transform md:group-hover:translate-x-0.5" />
    </RouteLink>
  );
}

// One combinaison card (three tasks a candidate may receive together).
//
// `year`/`month` are optional: the Sujets d'actualité page renders the same
// card without them, and a card that does not know where it sits simply shows
// no link to its corrigé.
export function EECombinaison({ s, i, year, month }) {
  const { c, t } = useApp();
  const n = s.n ?? i + 1;
  const offerAnswer = hasAnswer(s) && year != null && month?.monthNum != null;
  return (
    <Card className={`p-6 md:p-7 ${offerAnswer ? "group" : ""}`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{n}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Combinaison")} {n}</h2>
      </div>
      <div className="space-y-5">
        {s.t1 && <Task n={1} words="60–120 mots">{s.t1}</Task>}
        {s.t2 && <><div className={`border-t ${c.border}`} /><Task n={2} words="120–150 mots">{s.t2}</Task></>}
        {s.t3 && <><div className={`border-t ${c.border}`} /><TaskThree data={s.t3} /></>}
      </div>
      {offerAnswer && <AnswerCta year={year} monthNum={month.monthNum} n={n} />}
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
