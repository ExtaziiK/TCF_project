import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { waveDepth } from "./WaveSection";
import {
  BRAND, Bubble, Tile, Tag, Maple, Flight,
  Pumpkin, Ghost, Bat, Snowflake, Tree, Gift, Ornament, Garland,
} from "./stickers";

// Seasonal restyling of the sticker layouts (SectionDecor). A theme never moves
// a sticker — each layout keeps its hand-placed positions — it re-dresses them:
//   colors  brand colour → seasonal colour, for every sticker
//   shapes  the maple leaves become these, in turn ([Shape, fixed colour?])
//   flight  what replaces the paper-plane flight path
//   text    generic phrases swapped for seasonal ones (contextual ones like
//           "NCLC 7" or "Objectif CLB 7" stay)

const { blue, violet, red, amber } = BRAND;

const THEMES = {
  halloween: {
    colors: { [blue]: "#EA6A12", [violet]: "#7C3AED", [red]: "#2F9E44", [amber]: "#E8A10C" },
    shapes: [[Pumpkin, "#EA6A12"], [Ghost], [Bat, "#7C3AED"]],
    flight: [Flight, { lead: "bat" }],
    text: {
      "Bonjour !": "Boo !",
      "On y va ?": "Un bonbon ?",
      "Bravo !": "Frissons !",
      "À vous de jouer !": "Même pas peur !",
      "Regardez !": "Ouh là là !",
      "Génial !": "Terrifiant !",
      "Prêt ?": "Boo !",
      "À bientôt au Canada !": "Joyeux Halloween !",
    },
  },
  christmas: {
    colors: { [blue]: "#D62839", [violet]: "#1E8A4C", [red]: "#2F7FC1", [amber]: "#D4A017" },
    shapes: [[Snowflake, "#5AA9E6"], [Tree, "#1E8A4C"], [Gift, "#D62839"], [Ornament]],
    flight: [Garland, {}],
    text: {
      "Bonjour !": "Joyeux Noël !",
      "On y va ?": "Ho ho ho !",
      "Bravo !": "Bonnes fêtes !",
      "Vos outils": "Vos cadeaux",
      "Regardez !": "Un cadeau ?",
      "Merci !": "Merci, Père Noël !",
      "À bientôt au Canada !": "Joyeux Noël et bonne année !",
    },
  },
};

// Layout rows are [Sticker, props, ...placement]; the placement passes through.
export function themed(items, theme) {
  const spec = THEMES[theme];
  if (!spec) return items;
  let leaf = 0;
  return items.map(([Sticker, props, ...rest]) => {
    const p = { ...props, color: spec.colors[props.color] || props.color };
    if (p.text) p.text = spec.text[p.text] || p.text;
    if (Sticker === Maple) {
      const [Shape, fixed] = spec.shapes[leaf++ % spec.shapes.length];
      return [Shape, fixed ? { ...p, color: fixed } : p, ...rest];
    }
    if (Sticker === Flight) return [spec.flight[0], { ...p, ...spec.flight[1] }, ...rest];
    return [Sticker, p, ...rest];
  });
}

// A small inline sample of a theme's stickers, for the admin picker.
const SAMPLE = [
  [Bubble, { text: "Bonjour !", color: blue, tilt: -6 }],
  [Maple, { color: red, size: 40, tilt: 10 }],
  [Tile, { ch: "É", pts: 3, color: violet, tilt: -8 }],
  [Maple, { color: amber, size: 40, tilt: -12 }],
  [Tag, { text: "C1", color: red, tilt: 6 }],
  [Maple, { color: blue, size: 40, tilt: 8 }],
];

export function ThemePreview({ theme }) {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-3">
      {themed(SAMPLE, theme).map(([Sticker, props], i) => <Sticker key={i} {...props} />)}
    </div>
  );
}

/* ── Ambient layer ──────────────────────────────────────────────────────────
 * Falling snow for Christmas, spiders dropping on their thread for Halloween,
 * nothing by default. SectionDecor draws it in its own decoration layer, so
 * like the stickers it always sits BEHIND the section's content (the content
 * is positioned after it) and in front of the section's background only. It
 * shows at every screen size, unlike the stickers. Transform-only loops; under
 * prefers-reduced-motion the global rule stops them and their resting position
 * is out of view, so the layer simply disappears. */

// Deterministic pseudo-random spread, so the snow looks the same every render.
const FLAKES = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + ((i * 7) % 5),
  speed: 45 + ((i * 13) % 35), // px per second, so tall and short sections snow alike
  phase: ((i * 0.618) % 1),
  drift: ((i * 29) % 80) - 40,
}));

// Flakes fall the full height of the section, which is only known once laid
// out (and changes with the content), hence the observer. The density follows
// the height too: about one flake per 45px.
function Snowfall() {
  const { dark } = useApp();
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new window.ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fall = h + 24;
  const count = Math.min(FLAKES.length, Math.max(8, Math.round(h / 45)));
  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none" style={{ "--fall": `${fall}px` }}>
      {h > 0 && FLAKES.slice(0, count).map((f, i) => (
        <span key={i} className="snow-flake rounded-full"
          style={{
            left: `${f.left}%`, width: f.size, height: f.size,
            background: dark ? "rgba(255,255,255,.75)" : "rgba(126,160,214,.55)",
            animationDuration: `${(fall / f.speed).toFixed(1)}s`,
            animationDelay: `${(-f.phase * fall / f.speed).toFixed(1)}s`,
            "--drift": `${f.drift}px`,
          }} />
      ))}
    </div>
  );
}

function Spider({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" className="spider-swing block">
      <g stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M20 0v12" strokeWidth="1" />
        <path d="M15 18Q8 12 4 16M14 21Q6 18 2 23M14 25Q6 26 3 32M15 28Q9 32 7 38" />
        <path d="M25 18Q32 12 36 16M26 21Q34 18 38 23M26 25Q34 26 37 32M25 28Q31 32 33 38" />
      </g>
      <ellipse cx="20" cy="26" rx="7" ry="8" fill={color} />
      <circle cx="20" cy="16" r="4.5" fill={color} />
      <circle cx="18.3" cy="15.5" r="0.9" fill="#FFFFFF" />
      <circle cx="21.7" cy="15.5" r="0.9" fill="#FFFFFF" />
    </svg>
  );
}

// Where each spider hangs across the section (% of its width), how far it
// drops and its rhythm. The inner two only show on wide screens, where the
// margins are.
const SPIDERS = [
  { x: 5, drop: 170, duration: 10 },
  { x: 93, drop: 230, duration: 12 },
  { x: 17, drop: 110, duration: 11, wide: true },
  { x: 82, drop: 140, duration: 13, wide: true },
];

// Under a wave (WaveSection), a spider hangs from the edge of the curve, not
// from the top of the section: its anchor is the curve's depth at that point
// times the cap's height, which follows the cap's own breakpoints (h-20,
// md:h-32, lg:h-40). Each spider is clipped by a box starting at its anchor,
// so when it climbs back it vanishes into the curve instead of showing over the
// section above.
function Spiders({ seed, wave }) {
  const { dark } = useApp();
  const color = dark ? "#C4B5FD" : "#2B2238";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none [--cap:80px] md:[--cap:128px] lg:[--cap:160px]">
      {SPIDERS.map((s, i) => {
        // Sections start their spiders at different moments, so they never drop in step.
        const anim = { animationDuration: `${s.duration}s`, animationDelay: `${-((seed * 3.1 + i * 4.3) % s.duration).toFixed(1)}s` };
        const depth = wave ? waveDepth(wave.shape, wave.flip, s.x / 100) : 0;
        return (
          <span key={i} className={`absolute overflow-hidden ${s.wide ? "hidden xl:block" : "block"}`}
            style={{ left: `calc(${s.x}% - 24px)`, top: `calc(var(--cap) * ${depth.toFixed(3)})`, width: 48, height: s.drop + 36, "--drop": `${s.drop}px` }}>
            <span className="spider-thread absolute top-0 left-6 w-px" style={{ height: s.drop, background: dark ? "rgba(255,255,255,.4)" : "rgba(43,34,56,.4)", ...anim }} />
            <span className="spider-drop absolute top-0 left-[10px]" style={anim}><Spider color={color} /></span>
          </span>
        );
      })}
    </div>
  );
}

export function SeasonalDecor({ seed = 0, wave = null }) {
  const theme = useSiteTheme();
  if (theme === "christmas") return <Snowfall />;
  if (theme === "halloween") return <Spiders seed={seed} wave={wave} />;
  return null;
}
