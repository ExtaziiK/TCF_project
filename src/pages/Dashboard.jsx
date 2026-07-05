import { Clock, CheckCircle2, Target, Flame, Sparkles, Calendar, ArrowRight, FileText, BarChart3, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { LoginGate } from "@/components/auth/LoginGate";
import { PageShell, Card, Pill, Btn, LevelRibbon, ProgressBar } from "@/components/common";
import { BADGES, LEADER, HISTORY } from "@/constants/gamification";

function DashboardView() {
  const { c, nav, user } = useApp();
  const week = ["L", "M", "M", "J", "V", "S", "D"];
  const studied = [1, 1, 1, 1, 0, 1, 0];
  return (
    <PageShell wide eyebrow="Tableau de bord" title={`Bonjour, ${user.name} 👋`} sub="Vous êtes à 4 points de votre objectif hebdomadaire. Une session de 15 minutes suffira.">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* left 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ icon: Clock, n: "24 h 30", l: "Temps d'étude" }, { icon: CheckCircle2, n: "186", l: "Exercices terminés" }, { icon: Target, n: "71 %", l: "Score moyen" }, { icon: Flame, n: "12 jours", l: "Série en cours", hot: true }].map((s) => (
              <Card key={s.l} className="p-4">
                <s.icon size={18} className={s.hot ? "text-rose-600" : "text-blue-600"} />
                <p className={`font-display font-extrabold text-2xl mt-2 ${c.text}`}>{s.n}</p>
                <p className={`text-xs ${c.faint}`}>{s.l}</p>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-display font-bold ${c.text}`}>Votre niveau CECR estimé</h3>
              <Pill tone="blue">Mis à jour aujourd'hui</Pill>
            </div>
            <LevelRibbon current="B1" target="B2" />
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {[["Compréhension orale", 78, "B2"], ["Compréhension écrite", 71, "B1+"], ["Expression écrite", 64, "B1"], ["Expression orale", 58, "B1"]].map(([t, p, lv]) => (
                <div key={t} className={`p-4 rounded-2xl border ${c.border}`}>
                  <div className="flex justify-between text-sm mb-2"><span className={`font-medium ${c.text}`}>{t}</span><span className="font-mono2 font-semibold text-blue-600">{lv}</span></div>
                  <ProgressBar pct={p} tone="grad" />
                </div>
              ))}
            </div>
          </Card>
          <div className="grid sm:grid-cols-2 gap-5">
            <Card className="p-6 border-2 border-blue-600/40">
              <Pill tone="blue"><Sparkles size={12} /> Recommandé pour vous</Pill>
              <h3 className={`font-display font-bold mt-4 ${c.text}`}>Le subjonctif après « il faut que »</h3>
              <p className={`text-sm mt-2 ${c.sub}`}>Vous avez manqué 3 questions sur ce point cette semaine. Une leçon de 10 minutes puis 6 exercices.</p>
              <Btn small className="mt-5" icon={ArrowRight} onClick={() => nav("grammar")}>Commencer la leçon</Btn>
            </Card>
            <Card className="p-6">
              <Pill tone="red"><Calendar size={12} /> Examen blanc planifié</Pill>
              <h3 className={`font-display font-bold mt-4 ${c.text}`}>TCF Canada blanc n° 2</h3>
              <p className={`text-sm mt-2 ${c.sub}`}>Samedi 4 juillet · 9 h 00 · 2 h 47 au total. Un rappel par courriel vous sera envoyé la veille.</p>
              <Btn small variant="ghost" className="mt-5" onClick={() => nav("mocks")}>Voir les détails</Btn>
            </Card>
          </div>
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>Historique récent</h3>
            <div className="space-y-1">
              {HISTORY.map((h) => (
                <div key={h.t} className={`flex items-center gap-4 px-3 py-3 rounded-2xl ${c.hoverSoft}`}>
                  <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><FileText size={15} /></span>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${c.text}`}>{h.t}</p><p className={`text-xs ${c.faint}`}>{h.date} · {h.min} min</p></div>
                  <Pill tone={h.score.includes("/") ? "green" : "amber"}>{h.score}</Pill>
                </div>
              ))}
            </div>
            <Btn small variant="ghost" className="mt-4" onClick={() => nav("progress")} icon={BarChart3}>Voir toute ma progression</Btn>
          </Card>
        </div>
        {/* right column */}
        <div className="space-y-5">
          <Card className="p-6 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-rose-600/10 blur-xl" aria-hidden="true" />
            <Flame size={30} className="text-rose-600 mx-auto" />
            <p className={`font-display font-extrabold text-4xl mt-2 ${c.text}`}>12</p>
            <p className={`text-sm ${c.sub}`}>jours d'étude consécutifs</p>
            <div className="flex justify-center gap-2 mt-4" aria-label="Semaine en cours">
              {week.map((d, i) => (
                <span key={i} className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${studied[i] ? "grad-brand text-white" : `border ${c.border} ${c.faint}`}`}>{d}</span>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4"><h3 className={`font-display font-bold ${c.text}`}>Défi du jour</h3><Pill tone="amber"><Zap size={12} /> +40 pts</Pill></div>
            <p className={`text-sm ${c.sub}`}>Répondez à 5 questions de compréhension orale niveau B2 sans erreur.</p>
            <ProgressBar pct={60} tone="grad" />
            <p className={`text-xs mt-2 ${c.faint}`}>3 / 5 réussies</p>
            <Btn small className="mt-4 w-full" onClick={() => nav("listening")}>Continuer le défi</Btn>
          </Card>
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>Badges</h3>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((b) => (
                <div key={b.t} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${c.border} ${b.got ? "" : "opacity-35"}`} title={b.t}>
                  <b.icon size={20} className={b.got ? "text-amber-500" : c.faint} />
                  <p className={`text-[10px] text-center leading-tight font-medium ${c.sub}`}>{b.t}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>Classement hebdomadaire</h3>
            <div className="space-y-1">
              {LEADER.map((p, i) => (
                <div key={p.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${p.me ? "bg-blue-600/10 border border-blue-600/40" : ""}`}>
                  <span className={`w-6 text-sm font-mono2 font-bold ${i === 0 ? "text-amber-500" : c.faint}`}>{i + 1}</span>
                  <span className={`flex-1 text-sm font-medium ${c.text}`}>{p.name}{p.me && <span className="text-blue-600"> · vous</span>}</span>
                  <span className={`text-xs font-mono2 ${c.sub}`}>{p.pts} pts</span>
                  <span className="text-xs flex items-center gap-0.5 text-rose-600"><Flame size={11} />{p.streak}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function Dashboard() {
  return (
    <LoginGate>
      <DashboardView />
    </LoginGate>
  );
}
