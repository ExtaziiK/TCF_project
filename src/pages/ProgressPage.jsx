import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, ProgressBar } from "@/components/common";
import { HISTORY } from "@/constants/gamification";

export function ProgressPage() {
  const { c } = useApp();
  const mins = [35, 20, 45, 30, 0, 55, 40];
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const scores = [58, 61, 60, 66, 71];
  const max = 60;
  return (
    <PageShell wide eyebrow="Suivi de progression" title="Vos progrès, mesurés semaine après semaine" sub="Toutes vos sessions comptent : questions, examens blancs, vocabulaire et grammaire.">
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-1 ${c.text}`}>Temps d'étude cette semaine</h3>
          <p className={`text-sm ${c.faint} mb-6`}>3 h 45 au total · objectif : 4 h</p>
          <div className="flex items-end gap-3 h-44" role="img" aria-label="Minutes d'étude par jour">
            {mins.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className={`text-[10px] font-mono2 ${c.faint}`}>{m > 0 ? `${m}'` : "—"}</span>
                <div className="w-full rounded-t-xl grad-brand transition-all" style={{ height: `${(m / max) * 100}%`, minHeight: m ? 8 : 3, opacity: m ? 1 : 0.15 }} />
                <span className={`text-xs font-medium ${c.sub}`}>{days[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-1 ${c.text}`}>Score moyen · 5 dernières semaines</h3>
          <p className={`text-sm ${c.faint} mb-6`}>+13 points depuis le début du mois</p>
          <svg viewBox="0 0 300 150" className="w-full h-44" role="img" aria-label="Évolution du score moyen">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2E6BE6" /><stop offset="100%" stopColor="#D8354A" />
              </linearGradient>
              <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E6BE6" stopOpacity=".25" /><stop offset="100%" stopColor="#2E6BE6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const pts = scores.map((s, i) => [20 + i * 65, 140 - ((s - 50) / 30) * 120]);
              const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
              return (
                <>
                  <path d={`${path} L ${pts[pts.length - 1][0]},150 L 20,150 Z`} fill="url(#lg2)" />
                  <path d={path} fill="none" stroke="url(#lg1)" strokeWidth="3" strokeLinecap="round" />
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle cx={p[0]} cy={p[1]} r="5" fill="#fff" stroke="#2E6BE6" strokeWidth="2.5" />
                      <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2E6BE6" className="font-mono2">{scores[i]}%</text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-5 ${c.text}`}>Par section</h3>
          <div className="space-y-5">
            {[["Compréhension orale", 78], ["Compréhension écrite", 71], ["Expression écrite", 64], ["Expression orale", 58], ["Grammaire", 74], ["Vocabulaire", 82]].map(([t, p]) => (
              <div key={t}>
                <div className="flex justify-between text-sm mb-1.5"><span className={`font-medium ${c.text}`}>{t}</span><span className={`font-mono2 font-semibold ${c.sub}`}>{p} %</span></div>
                <ProgressBar pct={p} tone="grad" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Historique des sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}><th className="pb-3 pr-4 font-semibold">Activité</th><th className="pb-3 pr-4 font-semibold">Date</th><th className="pb-3 pr-4 font-semibold">Durée</th><th className="pb-3 font-semibold">Résultat</th></tr></thead>
              <tbody>
                {HISTORY.map((h) => (
                  <tr key={h.t} className={`border-t ${c.border}`}>
                    <td className={`py-3 pr-4 font-medium ${c.text}`}>{h.t}</td>
                    <td className={`py-3 pr-4 ${c.sub}`}>{h.date}</td>
                    <td className={`py-3 pr-4 font-mono2 ${c.sub}`}>{h.min} min</td>
                    <td className="py-3"><Pill tone={h.score.includes("/") ? "green" : "amber"}>{h.score}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
