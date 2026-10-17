import { GraduationCap, BookOpen, Repeat2, Headphones, PenLine, Mic, Keyboard } from "lucide-react";
import { RouteLink } from "@/components/common";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";
import { formatDuration } from "@/utils/dashboardStats";

// Detailed progression analytics, rendered inside the member dashboard
// (MemberHome): weekly study time, score trend, per-épreuve accuracy (EE/EO
// are self-assessed, not auto-graded), conjugation, and the session history.
// All values come from the user's real Supabase data (progressService).
//
// Same quiet frame as the rest of the dashboard — white cards, small caps
// titles — with colour used where it carries meaning: each épreuve in its
// site colour, results coloured by score band, the week's time in teal.

// Each épreuve / activity's colour, as elsewhere on the site.
const KIND = {
  co: { color: "#2E6BE6", icon: Headphones },
  ce: { color: "#D8354A", icon: BookOpen },
  ee: { color: "#6C4FE0", icon: PenLine },
  eo: { color: "#C9821A", icon: Mic },
  exam: { color: "#2563EB", icon: GraduationCap },
  conj: { color: "#0E7490", icon: Repeat2 },
  dictee: { color: "#1F2E66", icon: Keyboard },
};
const TEAL = "#0D9488";
// Score bands: green from 70 %, amber from 50 %, rose below.
const band = (pct) => (pct >= 70 ? "#059669" : pct >= 50 ? "#D97706" : "#E11D48");

function Title({ children, aside }) {
  const { c } = useApp();
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <h3 className={`text-xs font-bold uppercase tracking-widest ${c.faint}`}>{children}</h3>
      {aside}
    </div>
  );
}

function Bar({ pct, color, track }) {
  return (
    <div className={`h-2 rounded-full overflow-hidden ${track}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function ProgressPanels({ data }) {
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <StudyWeek week={data.week} />
      <ScoreTrend series={data.charts.scoreSeries} />
      <BySection sections={data.sections} />
      <ConjugationPanel data={data.conjugation} />
      <History sessions={data.sessions} />
    </div>
  );
}

/* ── study time this week ─────────────────────────────────────────────── */

function StudyWeek({ week }) {
  const { c, lang, t } = useApp();
  const maxMin = Math.max(1, ...week.days.map((d) => d.minutes));
  // Weekday initials come from the service in French (L M M J V S D).
  const dayInitial = (label, i) => (lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"][i] : label);
  const todayIdx = (new Date().getDay() + 6) % 7; // service weeks are Monday-first
  const LANE = 140; // px height of each day's track
  return (
    <Card className="p-6">
      <Title>{t("Temps d'étude cette semaine")}</Title>
      <p className={`font-display font-extrabold text-2xl ${c.text}`}>{formatDuration(week.minutes)}</p>
      <p className={`text-xs ${c.faint} mb-5`}>{week.activeDays} {t(week.activeDays > 1 ? "jours actifs" : "jour actif")}</p>
      {/* Heights are pixel values against a fixed budget: a percentage height
          would collapse, since the row's height isn't definite. */}
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: LANE + 22 }} role="img" aria-label={t("Minutes d'étude par jour")}>
        {week.days.map((d, i) => {
          const active = d.minutes > 0;
          const fillPx = active ? Math.max(10, Math.round((d.minutes / maxMin) * LANE)) : 0;
          const isToday = i === todayIdx;
          return (
            <div key={i} className="group relative flex-1 h-full" aria-label={`${dayInitial(d.label, i)} · ${d.minutes} min · ${d.count} ${t(d.count > 1 ? "activités" : "activité")}`}>
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] leading-tight whitespace-nowrap shadow-xl text-center">
                  <p className="font-bold">{active ? `${d.minutes} min` : t("Pas d'activité")}</p>
                  <p className="opacity-80">{active ? `${d.count} ${t(d.count > 1 ? "activités" : "activité")}` : "—"}</p>
                </div>
              </div>
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[22px] sm:w-[26px] rounded-lg ${c.track}`} style={{ height: LANE, boxShadow: isToday ? `0 0 0 2px ${TEAL}55` : undefined }} />
              {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[22px] sm:w-[26px] rounded-lg transition-all duration-500 group-hover:brightness-110" style={{ height: fillPx, background: TEAL }} />}
              {active && <span className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-mono2 font-bold whitespace-nowrap ${c.sub}`} style={{ bottom: fillPx + 5 }}>{d.minutes}&apos;</span>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2.5">
        {week.days.map((d, i) => (
          <span key={i} className={`flex-1 text-center text-xs font-bold ${i === todayIdx ? "" : c.faint}`} style={i === todayIdx ? { color: TEAL } : undefined}>{dayInitial(d.label, i)}</span>
        ))}
      </div>
    </Card>
  );
}

/* ── score trend ──────────────────────────────────────────────────────── */

function ScoreTrend({ series }) {
  const { c, t } = useApp();
  const last = series[series.length - 1];
  const delta = series.length > 1 ? last.pct - series[0].pct : 0;
  return (
    <Card className="p-6 flex flex-col">
      <Title aside={last && (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: band(last.pct) }}>
          {last.pct} %{series.length > 1 ? ` · ${delta >= 0 ? "+" : ""}${delta}` : ""}
        </span>
      )}>{t("Évolution du score")}</Title>
      <p className={`text-xs ${c.faint} mb-4`}>{t("Compréhension orale et écrite, TCF blancs : vos dernières sessions notées.")}</p>
      <div className="flex-1 flex items-center"><ScoreChart series={series} /></div>
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] ${c.faint}`}>
        {[["#059669", "≥ 70 %"], ["#D97706", "50–69 %"], ["#E11D48", "< 50 %"]].map(([col, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />{label}</span>
        ))}
      </div>
    </Card>
  );
}

// Area chart, 0–100: soft blue fill under the line, a dashed 70 % target, and
// each session's dot coloured by its score band.
function ScoreChart({ series }) {
  const { c, t } = useApp();
  if (series.length < 2) {
    return <p className={`w-full text-xs py-8 text-center ${c.faint}`}>{t("Terminez encore quelques quiz pour voir votre courbe de progression.")}</p>;
  }
  const w = 100, h = 46, pad = 4;
  const x = (i) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const y = (pct) => h - pad - (pct / 100) * (h - pad * 2);
  const line = series.map((e, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(e.pct).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }} role="img" aria-label={`${t("Évolution du score sur les")} ${series.length} ${t("derniers quiz")}`}>
      <defs>
        <linearGradient id="score-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" strokeWidth="0.25" className={c.faint} opacity="0.3" />
      ))}
      <line x1={pad} x2={w - pad} y1={y(70)} y2={y(70)} stroke="#059669" strokeWidth="0.4" strokeDasharray="1.5 1.2" opacity="0.8" />
      <text x={w - pad} y={y(70) - 1.2} textAnchor="end" fontSize="2.6" fill="#059669" fontWeight="700">70 %</text>
      <path d={area} fill="url(#score-area)" />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((e, i) => (
        <circle key={i} cx={x(i)} cy={y(e.pct)} r={i === series.length - 1 ? 1.9 : 1.35} fill={band(e.pct)} stroke="#FFFFFF" strokeWidth="0.45">
          <title>{`${t(e.label)} · ${e.pct} %`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ── per épreuve ──────────────────────────────────────────────────────── */

function BySection({ sections }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6">
      <Title>{t("Par épreuve")}</Title>
      <div className="mt-4 space-y-4">
        {sections.map((s) => {
          const k = KIND[s.section] || KIND.co;
          const selfAssessed = s.section === "ee" || s.section === "eo";
          return (
            <div key={s.section} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: k.color }}><k.icon size={15} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 text-sm mb-1.5">
                  <span className={`font-semibold truncate ${c.text}`}>{t(s.title)}</span>
                  {s.avg !== null ? (
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className={`font-mono2 font-bold ${c.text}`}>{s.avg} %</span>
                      {s.cefr && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ background: k.color }}>{s.cefr}</span>}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-semibold ${c.faint}`}>{t(selfAssessed ? "Auto-évaluée" : s.bankCount > 0 ? "Non tentée" : "Bientôt")}</span>
                  )}
                </div>
                {s.avg !== null ? (
                  <Bar pct={s.avg} color={k.color} track={c.track} />
                ) : (
                  <p className={`text-xs ${c.faint}`}>
                    {selfAssessed
                      ? t("Épreuve d'expression : travaillée dans l'atelier, non notée automatiquement.")
                      : s.bankCount > 0 ? `${s.bankCount} ${t("quiz disponibles — aucun tenté pour l'instant.")}` : t("Les quiz de cette épreuve arrivent bientôt.")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── conjugation ──────────────────────────────────────────────────────── */

// Its own panel rather than a row in "Par épreuve": a drill on the subjonctif
// is not an épreuve and is deliberately kept out of the averages above (see
// progressService). The empty state is an invitation rather than a blank card.
function ConjugationPanel({ data }) {
  const { c, t } = useApp();
  const color = KIND.conj.color;
  if (!data || data.count === 0) {
    return (
      <Card className="p-6 flex flex-col">
        <Title>{t("Conjugaison")}</Title>
        <p className={`text-sm mt-2 ${c.faint}`}>{t("Aucune série terminée pour l'instant.")}</p>
        <RouteLink r="conjugation" className="mt-auto pt-6 text-sm font-semibold inline-flex items-center gap-1.5" style={{ color }}>
          <Repeat2 size={15} aria-hidden="true" /> {t("Choisir un temps à travailler")}
        </RouteLink>
      </Card>
    );
  }
  const covered = Math.round((data.tensesPracticed / data.tensesTotal) * 100);
  return (
    <Card className="p-6">
      <Title aside={<span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>{data.avg} %</span>}>{t("Conjugaison")}</Title>
      <p className={`text-xs ${c.faint} mb-3`}>
        {data.count} {t(data.count > 1 ? "séries terminées" : "série terminée")} · {data.tensesPracticed}/{data.tensesTotal} {t("temps travaillés")}
      </p>
      <Bar pct={covered} color={color} track={c.track} />
      <div className="mt-5 space-y-3">
        {data.byTense.slice(0, 5).map((row) => (
          <div key={row.tenseId}>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className={`font-medium ${c.text}`}>{t(row.title)}</span>
              <span className="font-mono2 font-bold text-xs" style={{ color: band(row.avg) }}>{row.avg} %</span>
            </div>
            <Bar pct={row.avg} color={band(row.avg)} track={c.track} />
          </div>
        ))}
      </div>
      {data.weakest && (
        <p className={`mt-5 text-xs ${c.faint}`}>
          {t("À revoir en priorité :")} <strong className={c.sub}>{t(data.weakest.title)}</strong> ({data.weakest.avg} %).
        </p>
      )}
    </Card>
  );
}

/* ── history ──────────────────────────────────────────────────────────── */

function History({ sessions }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6 sm:col-span-2">
      <Title aside={<span className={`text-xs font-mono2 font-semibold ${c.sub}`}>{sessions.length}</span>}>{t("Historique des sessions")}</Title>
      {sessions.length === 0 ? (
        <p className={`text-sm py-6 text-center ${c.faint}`}>{t("Aucune session terminée pour l'instant.")}</p>
      ) : (
        <ul className="mt-3 max-h-96 overflow-y-auto pr-1">
          {sessions.map((h, i) => {
            const k = KIND[h.kind === "quiz" ? h.section : h.kind] || KIND.exam;
            return (
              <li key={i} className={`flex items-center gap-3 py-3 ${i ? `border-t ${c.border}` : ""}`}>
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${k.color}1A`, color: k.color }}><k.icon size={15} /></span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold truncate ${c.text}`}>{t(h.title)}</span>
                  <span className={`block text-xs ${c.faint}`}>{t(h.date)} · {h.minutes} min</span>
                </span>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold font-mono2 text-white" style={{ background: Number.isFinite(h.pct) ? band(h.pct) : k.color }}>{h.result}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
