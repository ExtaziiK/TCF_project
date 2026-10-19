import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CALC_PROFILES, SCORE_RANGE, SECTION_LABELS, nclcFor, cecrlFor, pointsToNclc } from "@/utils/nclc";

// TCF Canada score → NCLC calculator, in a flat geometric style: one solid
// tile per épreuve (each with its own shape — circle, square, triangle,
// half-moon), a flat bar chart of the four levels against the program's
// threshold, and a one-block verdict. No gradients, glows or shadows, and as
// little text as possible: each fact appears once — a tile gives its NCLC and
// what is missing, the chart compares, the verdict concludes. Numbers are the
// official IRCC bands (api/_lib/scoreBands.js).
//
// Self-contained (own state) so it sits on both the landing page and the
// /calculator route. Scores are typed or slid; everything updates live.

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
// Bar height per NCLC level in the chart, in % of its height (10 → 84 %,
// leaving room above the tallest bar).
const BAR = 8.4;

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

// One épreuve: its name and CEFR level, the score (typed or slid), its NCLC
// and the points to the next step — the threshold first, then the next level.
function SkillTile({ s, value, onChange, threshold, t }) {
  const { bg, fg } = TILE[s];
  const { min, max } = SCORE_RANGE[s];
  const num = value === "" ? min : Number(value);
  const pct = ((num - min) / (max - min)) * 100;
  const nclc = nclcFor(s, value);
  const level = nclc || 0;
  const goal = level < threshold ? threshold : level < 10 ? Math.max(level + 1, 4) : null;
  const missing = goal ? pointsToNclc(s, value, goal) : null;

  return (
    <div className="relative overflow-hidden rounded-[26px] p-5" style={{ background: bg, color: fg, "--fg": fg, "--bg": bg }}>
      <TileShape s={s} color={fg} />

      <div className="relative flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-tight">{t(SECTION_LABELS[s])}</p>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0" style={{ background: fg, color: bg }}>
          {cecrlFor(s, value)}
        </span>
      </div>

      <div className="relative mt-3 flex items-baseline gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(s, e.target.value)}
          aria-label={`${t(SECTION_LABELS[s])} — ${t("score")}`}
          className="w-[3.4ch] bg-transparent outline-none font-display font-extrabold text-5xl leading-none tabular-nums focus-visible:underline decoration-4 underline-offset-8"
          style={{ color: fg, caretColor: fg }}
        />
        <span className="text-sm font-bold">/{max}</span>
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

      <div className="relative mt-4 flex items-end justify-between gap-2">
        <p className="font-display font-extrabold text-2xl leading-none">
          <span className="text-xs font-extrabold tracking-[0.15em] mr-1.5">NCLC</span>{nclc == null ? "—" : nclc === 0 ? "< 4" : nclc}
        </p>
        <p className="text-xs font-bold">
          {value === "" ? "—" : goal == null ? t("NCLC max") : missing != null ? `+${missing} ${t("pts")} → NCLC ${goal}` : ""}
        </p>
      </div>
    </div>
  );
}

export function ScoreCalculator() {
  const { c, dark, nav, t } = useApp();
  const [scores, setScores] = useState({ co: "480", ce: "445", ee: "10", eo: "10" });

  const profile = CALC_PROFILES[0]; // Entrée express fédéral — les 4 épreuves ≥ NCLC 7
  const threshold = 7;

  // Clamp to the skill's range whether the value arrives from the slider or
  // the keyboard: the HTML `max` only validates, it doesn't stop someone
  // typing 999.
  const setScore = (s, v) => {
    let next = v;
    if (v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) return; // ignore non-numeric keystrokes
      const { min, max } = SCORE_RANGE[s];
      next = String(Math.min(max, Math.max(min, n)));
    }
    setScores((prev) => ({ ...prev, [s]: next }));
  };

  const levels = Object.fromEntries(ORDER.map((s) => [s, nclcFor(s, scores[s]) || 0]));
  const minNclc = Math.min(...ORDER.map((s) => levels[s]));
  const allMet = ORDER.every((s) => levels[s] >= profile.min[s]);
  const short = ORDER.filter((s) => levels[s] < profile.min[s]);

  // The result panel is flat paper: cream in light mode, deep navy in dark.
  const paper = dark
    ? { bg: "#141A33", ink: "#E8ECFA", sub: "#AAB4D6" }
    : { bg: "#F4F1EA", ink: NAVY, sub: "#4A5578" };
  const verdict = allMet ? { bg: "#0B7A55", fg: "#FFFFFF" } : { bg: "#F5A524", fg: NAVY };

  return (
    <div className="space-y-3">
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-stretch">
        <div className="grid sm:grid-cols-2 gap-4">
          {ORDER.map((s) => <SkillTile key={s} s={s} value={scores[s]} onChange={setScore} threshold={threshold} t={t} />)}
        </div>

        <div className="rounded-[26px] p-5 sm:p-6 flex flex-col" style={{ background: paper.bg, color: paper.ink }}>
          <span className="self-start px-3 py-1 rounded-full text-[11px] font-extrabold" style={{ background: paper.ink, color: paper.bg }}>
            {t("Entrée express")} · NCLC {threshold}
          </span>

          {/* Flat bar chart: one column per épreuve, the threshold as a rule. */}
          <div className="relative mt-6 h-44" role="img"
            aria-label={`${ORDER.map((s) => `${CODES[s]} NCLC ${levels[s] || "< 4"}`).join(", ")}. ${t("Seuil")} : NCLC ${threshold}.`}>
            <div className="absolute inset-0 flex items-end gap-3 pr-8" aria-hidden="true">
              {ORDER.map((s) => (
                <div key={s} className="flex-1 rounded-t-xl transition-[height] duration-500 ease-out"
                  style={{ height: `${Math.max(levels[s], 0.6) * BAR}%`, background: TILE[s].bg }} />
              ))}
            </div>
            <div className="absolute inset-x-0 z-10 flex items-center gap-2 translate-y-1/2" style={{ bottom: `${threshold * BAR}%` }} aria-hidden="true">
              <span className="flex-1 h-[3px] rounded-full" style={{ background: paper.ink }} />
              <span className="text-xs font-extrabold">{threshold}</span>
            </div>
          </div>
          <div className="mt-2 flex gap-3 pr-8" aria-hidden="true">
            {ORDER.map((s) => <span key={s} className="flex-1 text-center text-[11px] font-extrabold tracking-wider" style={{ color: paper.sub }}>{CODES[s]}</span>)}
          </div>

          {/* Verdict: the lowest level decides. */}
          <div className="mt-5 rounded-[20px] p-4 flex items-center gap-4 relative overflow-hidden" style={{ background: verdict.bg, color: verdict.fg }} aria-live="polite">
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ background: verdict.fg, opacity: 0.14 }} aria-hidden="true" />
            <div className="relative text-center shrink-0">
              <p className="font-display font-extrabold text-4xl leading-none tabular-nums">{minNclc || "<4"}</p>
              <p className="text-[10px] font-extrabold tracking-[0.15em] mt-1">{t("NCLC min.")}</p>
            </div>
            <div className="relative min-w-0">
              <p className="font-display font-extrabold text-xl leading-tight flex items-center gap-2">
                {allMet && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                {t(allMet ? "Éligible" : "Pas encore")}
              </p>
              <p className="text-xs font-semibold mt-0.5">
                {allMet ? t("Visez NCLC 9+ pour plus de points CRS.") : `${t("À renforcer :")} ${short.map((s) => CODES[s]).join(", ")}`}
              </p>
            </div>
          </div>

          <button type="button" onClick={() => nav("mocks")}
            className="mt-5 lg:mt-auto group w-full rounded-2xl pl-5 pr-2 py-2 font-bold text-sm flex items-center justify-between gap-3"
            style={{ background: paper.ink, color: paper.bg }}>
            {t("Testez votre niveau gratuitement")}
            <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition-transform duration-200 group-hover:translate-x-1" style={{ background: "#D8354A", color: "#FFFFFF" }}>
              <ArrowRight size={17} />
            </span>
          </button>
        </div>
      </div>

      <p className={`text-[11px] px-1 ${c.faint}`}>{t("Résultat indicatif — vérifiez les seuils officiels (IRCC, MIFI).")}</p>
    </div>
  );
}
