import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles, FileText, PenLine, Headphones } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";
import { loadAnswers } from "@/services/sujetsAnswersService";
import { monthLabel } from "@/services/sujetsArchiveService";
import { ModelAnswer } from "@/components/expression/ModelAnswer";
import { handOff } from "@/utils/handoff";

// Premium page behind « Voir un modèle de réponse » on the Expression écrite
// archive. The route carries which subject to show — "sujet-reponse/2026-09/3"
// is combinaison 3 of September 2026 (see DYNAMIC_ROUTES in constants/seo.js).
//
// Access is enforced twice, deliberately: RouteGuard keeps a free account off
// the page, and the sujets_answers RLS keeps the rows unreadable even to
// someone bypassing the UI. This component assumes neither — an empty result
// renders as "pas encore de modèle" rather than as a broken page.

const TASK_META = {
  1: { title: "Tâche 1 · Message", words: "60 à 120 mots" },
  2: { title: "Tâche 2 · Article, courrier ou note", words: "120 à 150 mots" },
  3: { title: "Tâche 3 · Comparer deux points de vue", words: "120 à 180 mots" },
};

// "sujet-reponse/2026-09/3" -> { year: 2026, monthNum: 9, n: 3 }
function parseRoute(route) {
  const m = /^sujet-reponse\/(\d{4})-(\d{2})\/(\d{1,3})$/.exec(route || "");
  if (!m) return null;
  return { year: Number(m[1]), monthNum: Number(m[2]), n: Number(m[3]) };
}

// The consigne as the candidate needs it beside the answer: for tâche 3 the
// theme AND both documents, since the first part of the answer is their
// synthesis.
function consigneOf(tache, s) {
  if (!s) return "";
  if (tache !== 3) return s[`t${tache}`] || "";
  return [s.t3?.theme, s.t3?.doc1 && `Document 1 : ${s.t3.doc1}`, s.t3?.doc2 && `Document 2 : ${s.t3.doc2}`].filter(Boolean).join("\n\n");
}

function TaskAnswer({ tache, consigne, answer, onWrite, onDictee }) {
  const { c, t } = useApp();
  const meta = TASK_META[tache];
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{meta.title}</span>
        <Pill tone="slate">{meta.words}</Pill>
      </div>

      {consigne && (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 mb-5`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
            <FileText size={12} /> {t("Consigne")}
          </p>
          <p className={`text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{consigne}</p>
        </div>
      )}

      {answer ? (
        <>
          <ModelAnswer tache={tache} answer={answer} />
          {/* The same subject, practised: write your own text and have it
              corrected, then take this one down under dictation. */}
          <div className={`mt-5 pt-5 border-t ${c.border} flex flex-wrap gap-2`}>
            {onWrite && <Btn small variant="ghost" icon={PenLine} onClick={onWrite}>{t("Rédiger ma version")}</Btn>}
            {onDictee && <Btn small variant="ghost" icon={Headphones} onClick={onDictee}>{t("Faire la dictée de ce corrigé")}</Btn>}
          </div>
        </>
      ) : (
        <p className={`text-sm ${c.faint}`}>{t("Le modèle de cette tâche n'a pas encore été rédigé.")}</p>
      )}
    </Card>
  );
}

export function SujetModeleReponse() {
  const { c, t, route, nav } = useApp();
  const { loading: archiveLoading, years } = useSujetsArchive("ee");
  const [state, setState] = useState({ loading: true, answers: {} });

  // Primitives, not the parsed object: parseRoute builds a new object on every
  // render, so depending on it directly would re-fire the effect forever.
  const target = useMemo(() => parseRoute(route), [route]);
  const year = target?.year;
  const monthNum = target?.monthNum;
  const n = target?.n;

  useEffect(() => {
    if (year == null) return setState({ loading: false, answers: {} });
    let alive = true;
    setState({ loading: true, answers: {} });
    loadAnswers("ee", year, monthNum, n).then((r) => { if (alive) setState({ loading: false, answers: r.answers }); });
    return () => { alive = false; };
  }, [year, monthNum, n]);

  // The consigne itself comes from the public archive, so the page shows the
  // subject beside its model answer instead of the answer alone.
  const combinaison = useMemo(() => {
    if (year == null) return null;
    const y = years.find((x) => x.year === year);
    const m = y?.months.find((x) => x.monthNum === monthNum);
    return m?.data.find((s, i) => (s.n ?? i + 1) === n) || null;
  }, [years, year, monthNum, n]);

  if (!target) {
    return (
      <PageShell back title={t("Modèle de réponse")} sub={t("Cette adresse ne correspond à aucun sujet.")}>
        <Card className="p-10 text-center"><p className={`text-sm ${c.faint}`}>{t("Revenez à l'archive pour choisir un sujet.")}</p></Card>
      </PageShell>
    );
  }

  const loading = state.loading || archiveLoading;
  const taches = [1, 2, 3].filter((k) => state.answers[k] || combinaison?.[`t${k}`] || (k === 3 && combinaison?.t3));
  const nothing = !loading && Object.keys(state.answers).length === 0;

  return (
    <PageShell
      back
      eyebrow={t("Expression écrite · Modèle de réponse")}
      title={`${t("Combinaison")} ${n} — ${monthLabel(monthNum)} ${year}`}
      sub={t("Un modèle C1-C2 pour chaque tâche, qui respecte la structure et la fourchette de mots de l'examen. Les expressions surlignées sont réutilisables dans n'importe quel sujet de la même tâche : ce sont elles qu'il faut mémoriser.")}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        <Pill tone="blue"><CalendarDays size={12} /> {monthLabel(monthNum)} {year}</Pill>
        <Pill tone="green"><Sparkles size={12} /> {t("Niveau C1-C2")}</Pill>
      </div>

      {loading ? (
        <Card className="p-10 text-center"><p className={`text-sm ${c.faint}`}>{t("Chargement…")}</p></Card>
      ) : nothing ? (
        <Card className="p-10 text-center">
          <p className={`font-display font-bold ${c.text}`}>{t("Pas encore de modèle pour ce sujet")}</p>
          <p className={`text-sm mt-1 ${c.sub}`}>{t("Les modèles sont rédigés au fur et à mesure. Revenez bientôt.")}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {taches.map((k) => (
            <TaskAnswer
              key={k}
              tache={k}
              consigne={consigneOf(k, combinaison)}
              answer={state.answers[k]}
              onWrite={combinaison ? () => { handOff("ee", { year, monthNum, n, task: k }); nav("writing"); } : null}
              onDictee={() => { handOff("dictee", { task: k, sujetKey: `${year}-${monthNum}-${n}` }); nav("dictee"); }}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
