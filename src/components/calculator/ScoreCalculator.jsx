import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Headphones, BookOpen, Pencil, Mic, Info, Plane, PlaneLanding, RadioTower, Sparkles, TriangleAlert } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { CALC_PROFILES, SCORE_RANGE, SECTION_LABELS, nclcFor, cecrlFor, pointsToNclc } from "@/utils/nclc";
import { Radar } from "@/components/calculator/Radar";
import { SplitFlap } from "@/components/calculator/SplitFlap";

// TCF Canada score → NCLC calculator, staged as an air-traffic control tower
// for the landing in Canada: the four épreuves are four instruments around a
// radar, whose clearance zone is the program's NCLC threshold; a departures
// board flips to the landing status, and a passport stamp slams down (with a
// burst of maple leaves) the moment all four clear it. Every visual is driven
// by the same numbers as before — the official IRCC bands in
// api/_lib/scoreBands.js — so the show never says something the grid doesn't.
//
// Self-contained (own state) so it sits on both the landing page and the
// /calculator route. Scores can be set with the slider OR typed; everything
// updates live — no "calculate" step. The console is a dark screen in both
// site themes, like the real thing.

// Paper score-report order: compréhension orale/écrite, then expression
// écrite/orale. The radar draws them clockwise from the top.
const ORDER = ["co", "ce", "ee", "eo"];
const ICONS = { co: Headphones, ce: BookOpen, ee: Pencil, eo: Mic };
const CODES = { co: "CO", ce: "CE", ee: "EE", eo: "EO" };
// The logo's palette (blue → violet → red), lifted to read as light on the dark
// console.
const NEON = { co: "#60A5FA", ce: "#A78BFA", ee: "#FB7185", eo: "#818CF8" };
const OK = "#34D399";
const SHORT = "#FB7185";

// Ready-made score sets to see the instruments react — labelled as flight
// phases, they are examples, not anyone's results.
const SCENARIOS = [
  { id: "turbulences", label: "Turbulences", icon: TriangleAlert, scores: { co: "380", ce: "400", ee: "7", eo: "8" } },
  { id: "approche", label: "Approche finale", icon: Plane, scores: { co: "470", ce: "450", ee: "10", eo: "11" } },
  { id: "atterrissage", label: "Atterrissage", icon: PlaneLanding, scores: { co: "530", ce: "525", ee: "14", eo: "13" } },
];

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The tower's clock, on Montréal time.
function TowerClock() {
  const fmt = () => new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(fmt()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="font-mono2 tabular-nums">{now}</span>;
}

// A maple leaf, for the confetti.
const MAPLE = "M12 1.5l1.7 3.9 2.6-1.2-.7 4.3 3.8-1.8-1 3.1 3.1.8-3.6 3.2 1 2-4.7-.8.2 4.8h-1.8l.2-4.8-4.7.8 1-2-3.6-3.2 3.1-.8-1-3.1 3.8 1.8-.7-4.3 2.6 1.2z";
const CONFETTI_COLORS = ["#60A5FA", "#A78BFA", "#FB7185", "#34D399", "#FBBF24", "#F8FAFC"];

// A burst of maple leaves and paper flecks from the stamp. Each piece's path
// is randomised once per burst; the pieces clear themselves after 1.8 s.
function Confetti({ burst }) {
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    id: `${burst}-${i}`,
    leaf: i % 3 === 0,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    dx: `${Math.round((Math.random() - 0.5) * 380)}px`,
    dy: `${Math.round(-60 + Math.random() * 300)}px`,
    rot: `${Math.round((Math.random() - 0.5) * 900)}deg`,
    delay: `${Math.round(Math.random() * 120)}ms`,
    size: 8 + Math.round(Math.random() * 8),
  })), [burst]);
  return (
    <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.id} className="confetti-piece"
          style={{ "--dx": p.dx, "--dy": p.dy, "--rot": p.rot, animationDelay: p.delay, width: p.size, height: p.leaf ? p.size : p.size * 0.6 }}>
          {p.leaf ? (
            <svg viewBox="0 0 24 24" width={p.size} height={p.size}><path d={MAPLE} fill={p.color} /></svg>
          ) : (
            <span className="block w-full h-full rounded-[2px]" style={{ background: p.color }} />
          )}
        </span>
      ))}
    </span>
  );
}

// A 10-segment LED meter for an NCLC level, the program's threshold marked.
function LedMeter({ level, threshold, color }) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const lit = n <= level;
        return (
          <span key={n} className="relative flex-1">
            <span className={`block h-3.5 rounded-[3px] transition-all duration-300 ${lit ? "led-on" : ""}`}
              style={{ background: lit ? color : "rgba(148,163,255,.12)", "--acc": color }} />
            {n === threshold && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-extrabold font-mono2 text-amber-300">▼</span>}
          </span>
        );
      })}
    </div>
  );
}

// One épreuve's instrument: big glowing digits (typed directly), a neon
// slider, the NCLC meter, its CEFR level and the points still missing.
function Instrument({ s, value, onChange, threshold, t }) {
  const Icon = ICONS[s];
  const acc = NEON[s];
  const { min, max } = SCORE_RANGE[s];
  const num = value === "" ? min : Number(value);
  const pct = ((num - min) / (max - min)) * 100;
  const nclc = nclcFor(s, value);
  const level = nclc || 0;
  const met = level >= threshold;
  const next = level >= 10 ? null : Math.max(level + 1, 4);
  const toNext = next ? pointsToNclc(s, value, next) : null;
  const toZone = !met ? pointsToNclc(s, value, threshold) : null;
  const cefr = cecrlFor(s, value);

  return (
    <div className="tower-panel p-4 relative overflow-hidden" style={{ "--acc": acc }}>
      <span className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-25" style={{ background: acc }} aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${acc}22`, color: acc, boxShadow: `inset 0 0 0 1px ${acc}55` }}>
            <Icon size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold tracking-[0.2em] font-mono2" style={{ color: acc }}>{CODES[s]}</span>
            <span className="block text-xs font-semibold text-slate-300 truncate">{t(SECTION_LABELS[s])}</span>
          </span>
        </span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono2 tracking-wider text-slate-200" style={{ background: "rgba(148,163,255,.12)" }}>
          {t("CECRL")} {cefr}
        </span>
      </div>

      <div className="relative mt-3 flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(s, e.target.value)}
            aria-label={`${t(SECTION_LABELS[s])} — ${t("score")}`}
            className="led-digits w-[4.2ch] bg-transparent outline-none font-mono2 font-extrabold text-4xl leading-none"
            style={{ color: acc, caretColor: acc }}
          />
          <span className="text-xs font-mono2 text-slate-500">/ {max}</span>
        </span>
        <span className="text-right">
          <span className="block text-[9px] font-extrabold tracking-[0.2em] text-slate-400">NCLC</span>
          <span className="block font-display font-extrabold text-2xl leading-none" style={{ color: met ? OK : SHORT, textShadow: `0 0 14px ${met ? OK : SHORT}88` }}>
            {nclc == null ? "—" : nclc === 0 ? "<4" : nclc}
          </span>
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={num}
        onChange={(e) => onChange(s, e.target.value)}
        aria-label={`${t(SECTION_LABELS[s])} — ${t("curseur de score")}`}
        className="range-neon relative w-full mt-3"
        style={{ background: `linear-gradient(90deg, ${acc}88, ${acc}) 0 0 / ${pct}% 100% no-repeat, rgba(148,163,255,.14)` }}
      />

      <div className="relative mt-4"><LedMeter level={level} threshold={threshold} color={met ? OK : acc} /></div>

      <p className="relative mt-2.5 text-[11px] font-semibold font-mono2 min-h-[1.25rem]">
        {value === "" ? (
          <span className="text-slate-400">{t("Saisissez votre score")}</span>
        ) : toZone ? (
          <span style={{ color: SHORT }}>+{toZone} {t("pts pour la zone NCLC")} {threshold}</span>
        ) : next && toNext != null ? (
          <span className="text-slate-400">+{toNext} {t("pts")} → NCLC {next}</span>
        ) : (
          <span style={{ color: OK }}>{t("Niveau maximal atteint")}</span>
        )}
      </p>
    </div>
  );
}

export function ScoreCalculator() {
  const { c, nav, t } = useApp();
  const [scores, setScores] = useState({ co: "480", ce: "445", ee: "10", eo: "10" });
  const [scenario, setScenario] = useState(null);
  const [burst, setBurst] = useState(0);

  const profile = CALC_PROFILES[0]; // Entrée express fédéral — les 4 épreuves ≥ NCLC 7
  const threshold = 7;

  // Clamp to the skill's range whether the value arrives from the slider or is
  // typed: the HTML `max` only validates, it doesn't stop someone typing 999.
  const setScore = (s, v) => {
    let next = v;
    if (v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) return; // ignore non-numeric keystrokes
      const { min, max } = SCORE_RANGE[s];
      next = String(Math.min(max, Math.max(min, n)));
    }
    setScenario(null);
    setScores((prev) => ({ ...prev, [s]: next }));
  };

  const levels = Object.fromEntries(ORDER.map((s) => [s, nclcFor(s, scores[s]) || 0]));
  const minNclc = Math.min(...ORDER.map((s) => levels[s]));
  const allMet = ORDER.every((s) => levels[s] >= profile.min[s]);
  const short = ORDER.filter((s) => levels[s] < profile.min[s]);

  // Confetti only on the transition into "cleared", not on first paint.
  const wasMet = useRef(allMet);
  useEffect(() => {
    if (allMet && !wasMet.current && !reducedMotion()) setBurst((b) => b + 1);
    wasMet.current = allMet;
  }, [allMet]);
  useEffect(() => {
    if (!burst) return undefined;
    const id = window.setTimeout(() => setBurst(0), 1900);
    return () => window.clearTimeout(id);
  }, [burst]);

  const status = allMet ? t("AUTORISÉ") : t("EN ATTENTE");
  const statusColor = allMet ? OK : "#FBBF24";

  return (
    <div className="space-y-3">
      <section className="tower p-4 sm:p-6 md:p-8" aria-label={t("Calculateur TCF Canada → NCLC")}>
        <div className="tower-grid" aria-hidden="true" />
        <div className="tower-scan" aria-hidden="true" />

        {/* ── header strip ───────────────────────────────────────────────── */}
        <header className="relative flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-lg shadow-blue-600/40" style={{ background: "linear-gradient(135deg,#2E6BE6,#6C4FE0 60%,#D8354A)" }}>
              <RadioTower size={19} />
            </span>
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.3em] text-blue-300 font-mono2">{t("TOUR DE CONTRÔLE · NCLC")}</p>
              <h3 className="font-display font-extrabold text-lg sm:text-xl text-white leading-tight">{t("Autorisation d'atterrissage au Canada")}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(251,113,133,.12)", color: "#FDA4AF" }}>
              <span className="w-2 h-2 rounded-full bg-rose-400 tower-blink" aria-hidden="true" /> {t("EN DIRECT")}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(148,163,255,.12)" }}>
              {t("Montréal")} <TowerClock />
            </span>
          </div>
        </header>

        {/* ── the cockpit: two instruments, the radar, two instruments ───── */}
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)] items-center">
          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4 order-2 lg:order-1">
            {["co", "ce"].map((s) => <Instrument key={s} s={s} value={scores[s]} onChange={setScore} threshold={threshold} t={t} />)}
          </div>

          <div className="order-1 lg:order-2 flex flex-col items-center gap-6 py-4">
            <Radar
              levels={levels}
              threshold={threshold}
              order={ORDER}
              accents={NEON}
              labels={CODES}
              cleared={allMet}
              ariaLabel={`${t("Radar NCLC")} : ${ORDER.map((s) => `${CODES[s]} ${levels[s] || "< 4"}`).join(", ")}. ${t("Zone requise")} : NCLC ${threshold}.`}
            />
            {/* Departures board: lowest level, and the landing status. */}
            <div className="tower-panel px-4 py-3 w-full max-w-[340px]">
              <div className="flex items-center justify-between text-[9px] font-extrabold tracking-[0.25em] text-slate-400 font-mono2 mb-2">
                <span>{t("NCLC MIN")}</span><span>{t("STATUT")}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-lg sm:text-xl" aria-live="polite">
                <SplitFlap text={minNclc ? String(minNclc).padStart(2, "0") : "<4"} length={2} tone={allMet ? OK : SHORT} label={`NCLC ${minNclc || "< 4"}`} />
                <SplitFlap text={status} length={10} tone={statusColor} />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4 order-3">
            {["ee", "eo"].map((s) => <Instrument key={s} s={s} value={scores[s]} onChange={setScore} threshold={threshold} t={t} />)}
          </div>
        </div>

        {/* ── scenarios ─────────────────────────────────────────────────── */}
        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold tracking-[0.25em] text-slate-400 font-mono2 mr-1">{t("SCÉNARIOS DE VOL")}</span>
          {SCENARIOS.map((sc) => {
            const on = scenario === sc.id;
            return (
              <button key={sc.id} type="button" aria-pressed={on}
                onClick={() => { setScenario(sc.id); setScores(sc.scores); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 ${on ? "text-slate-900" : "text-slate-200 hover:text-white"}`}
                style={on ? { background: "linear-gradient(90deg,#93C5FD,#C4B5FD,#FDA4AF)" } : { background: "rgba(148,163,255,.12)", boxShadow: "inset 0 0 0 1px rgba(148,163,255,.25)" }}>
                <sc.icon size={13} /> {t(sc.label)}
              </button>
            );
          })}
        </div>

        {/* ── clearance: the stamp, what is missing, the way forward ────── */}
        <div className="relative mt-6 grid md:grid-cols-[auto_minmax(0,1fr)_auto] gap-5 items-center tower-panel p-5">
          <div className="relative justify-self-center">
            <div key={allMet ? "ok" : "wait"}
              className={`w-32 h-32 rounded-full border-[3px] border-dashed grid place-items-center text-center ${allMet ? "stamp-slam" : "-rotate-12"}`}
              style={{ borderColor: allMet ? OK : "#FBBF24", color: allMet ? OK : "#FBBF24", boxShadow: allMet ? `0 0 30px ${OK}55, inset 0 0 20px ${OK}33` : "none" }}
              role="img" aria-label={t(allMet ? "Autorisé : les 4 épreuves atteignent NCLC 7" : "En attente : au moins une épreuve sous NCLC 7")}>
              <div>
                {allMet ? <PlaneLanding size={22} className="mx-auto" /> : <Plane size={22} className="mx-auto" />}
                <p className="font-display font-extrabold text-sm leading-tight mt-1 uppercase tracking-wide">{status}</p>
                <p className="font-mono2 text-[10px] font-bold mt-0.5">NCLC {threshold}</p>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] mt-0.5 opacity-80">{t("Entrée express")}</p>
              </div>
            </div>
            {burst > 0 && <Confetti burst={burst} />}
          </div>

          <div className="min-w-0">
            {allMet ? (
              <>
                <p className="font-display font-extrabold text-lg text-emerald-300 flex items-center gap-2"><Sparkles size={18} /> {t("Piste dégagée !")}</p>
                <p className="text-sm text-slate-300 mt-1">{t("Vos 4 épreuves atteignent le seuil NCLC 7 d'Entrée express (fédéral). Visez NCLC 9+ pour aller chercher le maximum de points CRS.")}</p>
              </>
            ) : (
              <>
                <p className="font-display font-extrabold text-lg text-amber-300">{t("Turbulences sur")} {short.map((s) => CODES[s]).join(" · ")}</p>
                <ul className="mt-2 space-y-1">
                  {short.map((s) => (
                    <li key={s} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: NEON[s] }} aria-hidden="true" />
                      <span><span className="font-semibold" style={{ color: NEON[s] }}>{t(SECTION_LABELS[s])}</span> : {t("encore")} <span className="font-mono2 font-bold text-white">+{pointsToNclc(s, scores[s] === "" ? 0 : scores[s], threshold)}</span> {t("pts pour NCLC")} {threshold}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-[11px] mt-3 flex items-start gap-1.5 text-slate-400">
              <Info size={13} className="shrink-0 mt-0.5" />
              {t("Votre niveau le plus bas détermine votre éligibilité aux programmes d'immigration")}
            </p>
          </div>

          <div className="md:w-56">
            <p className="font-display font-bold text-white text-sm">{t("Prêt·e pour le décollage ?")}</p>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">{t("Entraînez-vous avec nos simulations réalistes")}</p>
            <Btn variant="accent" className="w-full" icon={ArrowRight} onClick={() => nav("mocks")}>{t("Testez votre niveau gratuitement")}</Btn>
          </div>
        </div>
      </section>

      <p className={`text-[11px] leading-relaxed px-1 ${c.faint}`}>{t("Conversion basée sur la grille d'équivalence TCF Canada → NCLC d'IRCC. Résultat indicatif : vérifiez toujours les seuils officiels de votre programme (IRCC, MIFI).")}</p>
    </div>
  );
}
