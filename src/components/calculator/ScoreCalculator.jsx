import { useState } from "react";
import { ArrowRight, Minus, Plus, Check, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CALC_PROFILES, SCORE_RANGE, SECTION_LABELS, nclcFor, cecrlFor, pointsToNclc } from "@/utils/nclc";

// TCF Canada score → NCLC calculator, in a flat geometric style: one solid
// tile per épreuve (each with its own shape — circle, square, triangle,
// half-moon), a flat bar chart of the four NCLC levels against the program's
// threshold, and a verdict block. No gradients, no glows, no shadows: colour
// and shape carry everything. The numbers are the official IRCC bands
// (api/_lib/scoreBands.js) — the « +8 pts » hints come from the same table.
//
// Self-contained (own state) so it sits on both the landing page and the
// /calculator route. Scores can be typed, stepped with − / +, or slid;
// everything updates live — no "calculate" step.

// Paper score-report order: compréhension orale/écrite, then expression
// écrite/orale.
const ORDER = ["co", "ce", "ee", "eo"];
const CODES = { co: "CO", ce: "CE", ee: "EE", eo: "EO" };

// One flat colour per épreuve, from the brand palette, with the text colour
// that reads on it (≥ 4.5:1): white on blue, violet and red; navy on amber.
const NAVY = "#1F2E66";
const TILE = {
  co: { bg: "#2E6BE6", fg: "#FFFFFF" },
  ce: { bg: "#6C4FE0", fg: "#FFFFFF" },
  ee: { bg: "#D8354A", fg: "#FFFFFF" },
  eo: { bg: "#F5A524", fg: NAVY },
};
// − / + step: a point on the /20 épreuves, ten on the /699 ones.
const STEP = { co: 10, ce: 10, ee: 1, eo: 1 };

// Example profiles, to watch the calculator react. Each set sits squarely in
// the CEFR band it is named after (src/utils/nclc.js), so the label is true.
const EXAMPLES = [
  { id: "b1", label: "Profil B1", scores: { co: "350", ce: "360", ee: "7", eo: "8" } },
  { id: "b2", label: "Profil B2", scores: { co: "470", ce: "460", ee: "10", eo: "11" } },
  { id: "c1", label: "Profil C1", scores: { co: "560", ce: "555", ee: "15", eo: "15" } },
];

// Each tile's flat shape, large and cropped by the tile's corner.
function TileShape({ s, color }) {
  const flat = { fill: color, opacity: 0.16 };
  return (
    <svg viewBox="0 0 100 100" className="absolute -right-6 -bottom-6 w-36 h-36 pointer-events-none" aria-hidden="true">
      {s === "co" && <><circle cx="60" cy="60" r="38" {...flat} /><circle cx="60" cy="60" r="16" {...flat} /></>}
      {s === "ce" && <rect x="22" y="22" width="64" height="64" rx="6" transform="rotate(14 54 54)" {...flat} />}
      {s === "ee" && <polygon points="56,10 98,90 14,90" {...flat} />}
      {s === "eo" && <path d="M14 70 A42 42 0 0 1 98 70 Z" {...flat} />}
    </svg>
  );
}

// Ten flat squares for the NCLC level; a small triangle marks the threshold.
function LevelSquares({ level, threshold, fg }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        return (
          <span key={n} className="relative flex-1">
            {n === threshold && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px]" style={{ borderTopColor: fg }} />
            )}
            <span className="block h-2.5 rounded-[3px] transition-opacity duration-300" style={{ background: fg, opacity: n <= level ? 1 : 0.25 }} />
          </span>
        );
      })}
    </div>
  );
}

// One épreuve: a solid tile with its shape, the score (typed, stepped or
// slid), the NCLC squares, the CEFR level and the points still missing.
function SkillTile({ s, value, onChange, threshold, t }) {
  const { bg, fg } = TILE[s];
  const { min, max } = SCORE_RANGE[s];
  const num = value === "" ? min : Number(value);
  const pct = ((num - min) / (max - min)) * 100;
  const nclc = nclcFor(s, value);
  const level = nclc || 0;
  const met = level >= threshold;
  const next = level >= 10 ? null : Math.max(level + 1, 4);
  const toNext = next ? pointsToNclc(s, value, next) : null;
  const toZone = met ? null : pointsToNclc(s, value, threshold);
  const step = (d) => onChange(s, String(Math.min(max, Math.max(min, num + d))));
  const stepBtn = "w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100";

  return (
    <div className="relative overflow-hidden rounded-[26px] p-5" style={{ background: bg, color: fg, "--fg": fg, "--bg": bg }}>
      <TileShape s={s} color={fg} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-[0.2em]">{CODES[s]}</p>
          <p className="text-sm font-semibold leading-tight">{t(SECTION_LABELS[s])}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0" style={{ background: fg, color: bg }}>
          {t("CECRL")} {cecrlFor(s, value)}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-2">
        <button type="button" onClick={() => step(-STEP[s])} disabled={num <= min} aria-label={`${t(SECTION_LABELS[s])} −${STEP[s]}`}
          className={stepBtn} style={{ background: `${fg}26` }}><Minus size={16} /></button>
        <span className="flex-1 flex items-baseline justify-center gap-1 min-w-0">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(s, e.target.value)}
            aria-label={`${t(SECTION_LABELS[s])} — ${t("score")}`}
            className="w-[3.4ch] text-center bg-transparent outline-none font-display font-extrabold text-5xl leading-none tabular-nums focus-visible:underline decoration-4 underline-offset-8"
            style={{ color: fg, caretColor: fg }}
          />
          <span className="text-sm font-bold">/{max}</span>
        </span>
        <button type="button" onClick={() => step(STEP[s])} disabled={num >= max} aria-label={`${t(SECTION_LABELS[s])} +${STEP[s]}`}
          className={stepBtn} style={{ background: `${fg}26` }}><Plus size={16} /></button>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={num}
        onChange={(e) => onChange(s, e.target.value)}
        aria-label={`${t(SECTION_LABELS[s])} — ${t("curseur de score")}`}
        className="range-flat relative w-full mt-4"
        style={{ background: `linear-gradient(${fg},${fg}) 0 0 / ${pct}% 100% no-repeat, ${fg}40` }}
      />

      <div className="relative mt-5"><LevelSquares level={level} threshold={threshold} fg={fg} /></div>

      <div className="relative mt-3 flex items-end justify-between gap-2">
        <p className="font-display font-extrabold text-2xl leading-none">
          <span className="text-xs font-extrabold tracking-[0.15em] mr-1.5">NCLC</span>{nclc == null ? "—" : nclc === 0 ? "< 4" : nclc}
        </p>
        <p className="text-xs font-bold text-right">
          {value === "" ? t("Saisissez votre score")
            : toZone ? `+${toZone} ${t("pts pour NCLC")} ${threshold}`
              : next && toNext != null ? `+${toNext} ${t("pts")} → NCLC ${next}`
                : t("Niveau maximal atteint")}
        </p>
      </div>
    </div>
  );
}

export function ScoreCalculator() {
  const { c, dark, nav, t } = useApp();
  const [scores, setScores] = useState({ co: "480", ce: "445", ee: "10", eo: "10" });
  const [example, setExample] = useState(null);

  const profile = CALC_PROFILES[0]; // Entrée express fédéral — les 4 épreuves ≥ NCLC 7
  const threshold = 7;

  // Clamp to the skill's range whether the value arrives from the slider, the
  // steppers or the keyboard: the HTML `max` only validates, it doesn't stop
  // someone typing 999.
  const setScore = (s, v) => {
    let next = v;
    if (v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) return; // ignore non-numeric keystrokes
      const { min, max } = SCORE_RANGE[s];
      next = String(Math.min(max, Math.max(min, n)));
    }
    setExample(null);
    setScores((prev) => ({ ...prev, [s]: next }));
  };

  const levels = Object.fromEntries(ORDER.map((s) => [s, nclcFor(s, scores[s]) || 0]));
  const minNclc = Math.min(...ORDER.map((s) => levels[s]));
  const allMet = ORDER.every((s) => levels[s] >= profile.min[s]);
  const short = ORDER.filter((s) => levels[s] < profile.min[s]);

  // The result panel is flat paper: cream in light mode, deep navy in dark.
  const paper = dark
    ? { bg: "#141A33", ink: "#E8ECFA", sub: "#AAB4D6", rule: "#2A3360" }
    : { bg: "#F4F1EA", ink: NAVY, sub: "#4A5578", rule: "#DCD6C8" };
  const verdict = allMet ? { bg: "#0B7A55", fg: "#FFFFFF" } : { bg: "#F5A524", fg: NAVY };

  return (
    <div className="space-y-4">
      {/* Examples */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className={`text-xs font-bold mr-1 ${c.sub}`}>{t("Essayer :")}</span>
        {EXAMPLES.map((ex) => {
          const on = example === ex.id;
          return (
            <button key={ex.id} type="button" aria-pressed={on}
              onClick={() => { setExample(ex.id); setScores(ex.scores); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${on ? "border-transparent text-white" : `${c.border} ${c.text} ${c.hoverSoft}`}`}
              style={on ? { background: NAVY } : undefined}>
              {t(ex.label)}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-stretch">
        {/* ── the four épreuves ─────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {ORDER.map((s) => <SkillTile key={s} s={s} value={scores[s]} onChange={setScore} threshold={threshold} t={t} />)}
        </div>

        {/* ── the result, on flat paper ─────────────────────────────────── */}
        <div className="rounded-[26px] p-5 sm:p-6 flex flex-col" style={{ background: paper.bg, color: paper.ink }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: paper.sub }}>{t("RÉSULTAT")}</p>
              <h3 className="font-display font-extrabold text-xl leading-tight">{t("Votre profil NCLC")}</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold shrink-0" style={{ background: paper.ink, color: paper.bg }}>
              {t("Entrée express")} · NCLC {threshold}
            </span>
          </div>

          {/* Flat bar chart: one column per épreuve, the threshold as a rule. */}
          <div className="relative mt-6 h-48" role="img"
            aria-label={`${ORDER.map((s) => `${CODES[s]} NCLC ${levels[s] || "< 4"}`).join(", ")}. ${t("Seuil")} : NCLC ${threshold}.`}>
            <div className="absolute inset-0 flex items-end gap-3 pr-16" aria-hidden="true">
              {ORDER.map((s) => (
                <div key={s} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5">
                  <span className="text-sm font-extrabold tabular-nums">{levels[s] || "<4"}</span>
                  <div className="w-full rounded-t-xl transition-[height] duration-500 ease-out" style={{ height: `${Math.max(levels[s], 0.6) * 8.4}%`, background: TILE[s].bg }} />
                </div>
              ))}
            </div>
            {/* threshold rule, at the same scale as the bars (8.4% per level) */}
            <div className="absolute inset-x-0 z-10 flex items-center gap-2 translate-y-1/2" style={{ bottom: `${threshold * 8.4}%` }} aria-hidden="true">
              <span className="flex-1 h-[3px] rounded-full" style={{ background: paper.ink }} />
              <span className="text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded" style={{ background: paper.ink, color: paper.bg }}>{t("SEUIL")} {threshold}</span>
            </div>
          </div>
          <div className="mt-2 flex gap-3 pr-16" aria-hidden="true">
            {ORDER.map((s) => <span key={s} className="flex-1 text-center text-[11px] font-extrabold tracking-wider" style={{ color: paper.sub }}>{CODES[s]}</span>)}
          </div>
          <div className="mt-3 h-[2px]" style={{ background: paper.rule }} />

          {/* Lowest level + verdict */}
          <div className="mt-5 flex items-stretch gap-3">
            <div className="w-24 h-24 rounded-full grid place-items-center shrink-0 text-center" style={{ background: paper.ink, color: paper.bg }}>
              <div>
                <p className="text-[9px] font-extrabold tracking-[0.15em]">{t("NCLC MIN.")}</p>
                <p className="font-display font-extrabold text-4xl leading-none tabular-nums">{minNclc || "<4"}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0 rounded-[20px] p-4 relative overflow-hidden" style={{ background: verdict.bg, color: verdict.fg }} aria-live="polite">
              <span className="absolute -right-5 -top-5 w-20 h-20 rounded-full" style={{ background: verdict.fg, opacity: 0.14 }} aria-hidden="true" />
              <p className="relative font-display font-extrabold text-xl leading-tight flex items-center gap-2">
                {allMet && <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: verdict.fg, color: verdict.bg }}><Check size={15} strokeWidth={3} /></span>}
                {t(allMet ? "Éligible" : "Pas encore")}
              </p>
              {allMet ? (
                <p className="relative text-xs font-semibold mt-1">{t("Vos 4 épreuves atteignent le seuil NCLC 7 d'Entrée express (fédéral). Visez NCLC 9+ pour aller chercher le maximum de points CRS.")}</p>
              ) : (
                <div className="relative mt-2 flex flex-wrap gap-1.5">
                  {short.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[11px] font-extrabold" style={{ background: verdict.fg, color: verdict.bg }}>
                      {CODES[s]} +{pointsToNclc(s, scores[s] === "" ? 0 : scores[s], threshold)} {t("pts")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs flex items-start gap-1.5 font-medium" style={{ color: paper.sub }}>
            <Info size={13} className="shrink-0 mt-0.5" />
            {t("Votre niveau le plus bas détermine votre éligibilité aux programmes d'immigration")}
          </p>

          <button type="button" onClick={() => nav("mocks")}
            className="mt-5 lg:mt-auto group w-full rounded-2xl px-5 py-3.5 font-bold text-sm flex items-center justify-between gap-3"
            style={{ background: paper.ink, color: paper.bg }}>
            <span className="text-left">
              <span className="block">{t("Testez votre niveau gratuitement")}</span>
              <span className="block text-[11px] font-semibold">{t("Entraînez-vous avec nos simulations réalistes")}</span>
            </span>
            <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-200 group-hover:translate-x-1" style={{ background: "#D8354A", color: "#FFFFFF" }}>
              <ArrowRight size={17} />
            </span>
          </button>
        </div>
      </div>

      <p className={`text-[11px] leading-relaxed px-1 ${c.faint}`}>{t("Conversion basée sur la grille d'équivalence TCF Canada → NCLC d'IRCC. Résultat indicatif : vérifiez toujours les seuils officiels de votre programme (IRCC, MIFI).")}</p>
    </div>
  );
}
