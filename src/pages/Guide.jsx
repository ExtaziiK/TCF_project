import { Clock, CheckCircle2, XCircle, ShieldCheck, PenLine, Mic, Info, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import {
  GUIDE_EPREUVES, CECRL_SCALE, NCLC_ROWS, EE_TASKS, EO_TASKS, EXAM_DO, EXAM_DONT,
} from "@/constants/guide";

// Small section header, reusing the app's eyebrow/title rhythm so every
// block on the page lines up with the rest of the site.
function Block({ title, sub, children }) {
  const { c } = useApp();
  return (
    <section className="mb-12">
      <h3 className={`font-display font-bold text-xl md:text-2xl ${c.text}`}>{title}</h3>
      {sub && <p className={`mt-2 text-sm md:text-base leading-relaxed ${c.sub}`}>{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// A single expression épreuve card (EE or EO): numbered tasks + a meta line.
function ExpressionCard({ icon: Icon, tone, title, tasks }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={tone === "red" ? "text-rose-600" : "text-blue-600"} />
        <p className={`font-display font-bold ${c.text}`}>{t(title)}</p>
      </div>
      <div className="space-y-3.5">
        {tasks.map((tk) => (
          <div key={tk.n} className="flex items-start gap-3">
            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${tone === "red" ? "bg-rose-600/10 text-rose-600" : "bg-blue-600/10 text-blue-600"}`}>{tk.n}</span>
            <div>
              <p className={`text-sm ${c.text}`}>{t(tk.d)}</p>
              <p className={`text-xs mt-0.5 ${c.faint}`}>{t(tk.meta)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Guide() {
  const { c, nav, t } = useApp();
  return (
    <PageShell back center eyebrow={t("Guide de l'examen")} title={t("Le TCF Canada, expliqué simplement")} sub={t("L'essentiel à connaître avant le jour J : la structure des épreuves, la notation, les équivalences NCLC et les règles à respecter.")}>
      {/* ── The four épreuves ── */}
      <Block title={t("Les épreuves")} sub={t("4 épreuves obligatoires · durée totale 2 h 47. Survolez une épreuve pour en savoir plus.")}>
        <div className="space-y-4">
          {GUIDE_EPREUVES.map((e, i) => (
            <Card key={e.name} className="group p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/10 hover:border-blue-600/40">
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-2xl grad-brand text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25"><e.icon size={19} aria-hidden="true" /></span>
                <div className="flex-1 min-w-0">
                  <Pill tone="slate">{t("Épreuve")} {i + 1}</Pill>
                  <p className={`font-display font-bold mt-1.5 ${c.text}`}>{t(e.name)}</p>
                  <p className={`text-sm ${c.sub}`}>{t(e.detail)}</p>
                </div>
                <Pill tone="blue"><Clock size={12} /> {e.time}</Pill>
              </div>
              <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-64 group-hover:opacity-100 group-hover:mt-4">
                <p className={`text-sm leading-relaxed ${c.sub}`}>{t(e.long)}</p>
                {e.more && (
                  <button onClick={() => nav(e.more)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:gap-1.5 transition-all">
                    {t("Voir la méthode détaillée, tâche par tâche")} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Block>

      {/* ── How you are scored ── */}
      <Block title={t("Comment vous êtes noté")} sub={t("Le TCF n'a ni réussite ni échec : c'est une photographie de votre niveau. Le niveau requis dépend de l'organisme destinataire (IRCC).")}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <ShieldCheck size={20} className="text-blue-600 mb-3" />
            <ul className="space-y-2.5">
              {[
                "Compréhension : un score de 100 à 699 points par épreuve.",
                "Expression : une note sur 20, évaluée par deux correcteurs.",
                "Seules les bonnes réponses comptent : une erreur ne retire aucun point.",
                "L'attestation est valable 2 ans.",
              ].map((x) => (
                <li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">{t("L'échelle CECRL")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CECRL_SCALE.map((s) => (
                <div key={s.lvl} className={`rounded-2xl border ${c.border} px-3 py-2 text-center`}>
                  <p className={`font-display font-bold text-sm ${c.text}`}>{s.lvl}</p>
                  <p className={`text-xs font-mono2 ${c.faint}`}>{s.range}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Block>

      {/* ── NCLC / CLB correspondence ── */}
      <Block title={t("Votre score et le NCLC")} sub={t("Pour votre dossier d'immigration, reportez vos résultats via le Niveau de compétence linguistique canadien (NCLC) correspondant.")}>
        <div className={`overflow-x-auto rounded-3xl border ${c.border}`}>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className={c.hoverSoft}>
                <th className={`text-left px-4 py-3 font-bold ${c.text}`}>{t("NCLC")}</th>
                <th className={`text-left px-4 py-3 font-semibold ${c.sub}`}>{t("Compréhension orale")}</th>
                <th className={`text-left px-4 py-3 font-semibold ${c.sub}`}>{t("Compréhension écrite")}</th>
                <th className={`text-left px-4 py-3 font-semibold ${c.sub}`}>{t("Expression orale")} <span className={c.faint}>/20</span></th>
                <th className={`text-left px-4 py-3 font-semibold ${c.sub}`}>{t("Expression écrite")} <span className={c.faint}>/20</span></th>
              </tr>
            </thead>
            <tbody>
              {NCLC_ROWS.map((r) => (
                <tr key={r.nclc} className={`border-t ${c.border}`}>
                  <td className="px-4 py-3"><Pill tone="blue">{r.nclc}</Pill></td>
                  <td className={`px-4 py-3 font-mono2 ${c.sub}`}>{r.co}</td>
                  <td className={`px-4 py-3 font-mono2 ${c.sub}`}>{r.ce}</td>
                  <td className={`px-4 py-3 font-mono2 ${c.sub}`}>{r.eo}</td>
                  <td className={`px-4 py-3 font-mono2 ${c.sub}`}>{r.ee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      {/* ── Expression épreuves ── */}
      <Block title={t("Les épreuves d'expression")} sub={t("Chaque épreuve comporte 3 tâches. Respectez le nombre de mots et le temps imparti.")}>
        <div className="grid md:grid-cols-2 gap-4">
          <ExpressionCard icon={PenLine} tone="blue" title="Expression écrite" tasks={EE_TASKS} />
          <ExpressionCard icon={Mic} tone="red" title="Expression orale" tasks={EO_TASKS} />
        </div>
      </Block>

      {/* ── Exam day ── */}
      <Block title={t("Le jour de l'examen")}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4"><CheckCircle2 size={18} className="text-emerald-500" /><p className={`font-display font-bold ${c.text}`}>{t("À prévoir")}</p></div>
            <ul className="space-y-2.5">
              {EXAM_DO.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>))}
            </ul>
          </Card>
          <Card className="p-6 border-2 border-rose-600/20">
            <div className="flex items-center gap-2 mb-4"><XCircle size={18} className="text-rose-600" /><p className={`font-display font-bold ${c.text}`}>{t("Interdit")}</p></div>
            <ul className="space-y-2.5">
              {EXAM_DONT.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />{t(x)}</li>))}
            </ul>
          </Card>
        </div>
      </Block>

      {/* ── Closing CTA ── */}
      <Card className="p-6 border-2 border-blue-600/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Info size={20} /></span>
        <p className={`text-sm flex-1 ${c.sub}`}>{t("Le meilleur entraînement : passez un TCF blanc complet dans les conditions réelles, puis retravaillez les épreuves où vous perdez le plus de points.")}</p>
        <Btn variant="accent" icon={ArrowRight} className="shrink-0" onClick={() => nav("mocks")}>{t("Passer un TCF blanc")}</Btn>
      </Card>
    </PageShell>
  );
}
