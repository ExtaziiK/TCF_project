import { useApp } from "@/context/AppContext";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import {
  BRAND, Bubble, Tile, Tag, Maple, Flight,
  Pumpkin, Ghost, Bat, BatShape, Snowflake, Tree, Gift, Ornament, Garland,
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
 * Rendered once by the app shell, over every page: falling snow for Christmas,
 * a few bats crossing the screen for Halloween, nothing by default. Tiny,
 * translucent and click-through, under the nav and dialogs. Transform-only
 * loops; under prefers-reduced-motion the global rule stops them and their
 * resting position is off-screen, so the layer simply disappears. */

// Deterministic pseudo-random spread, so the snow looks the same every render.
const FLAKES = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + ((i * 7) % 5),
  duration: 10 + ((i * 13) % 10),
  delay: -((i * 1.7) % 18),
  drift: ((i * 29) % 80) - 40,
  // The first dozen also fall on phones; the rest only on wider screens.
  wide: i >= 12,
}));

function Snowfall() {
  const { dark } = useApp();
  return (
    <div aria-hidden="true" className="fixed inset-0 z-20 overflow-hidden pointer-events-none">
      {FLAKES.map((f, i) => (
        <span key={i} className={`snow-flake rounded-full ${f.wide ? "hidden md:block" : "block"}`}
          style={{
            left: `${f.left}%`, width: f.size, height: f.size,
            background: dark ? "rgba(255,255,255,.75)" : "rgba(126,160,214,.55)",
            animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`, "--drift": `${f.drift}px`,
          }} />
      ))}
    </div>
  );
}

const BATS = [
  { top: 18, duration: 30, delay: -4 },
  { top: 46, duration: 38, delay: -19 },
  { top: 72, duration: 34, delay: -30 },
];

function Bats() {
  const { dark } = useApp();
  return (
    <div aria-hidden="true" className="fixed inset-0 z-20 overflow-hidden pointer-events-none">
      {BATS.map((b, i) => (
        <span key={i} className="bat-fly" style={{ top: `${b.top}%`, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}>
          <svg width="36" height="22" viewBox="0 0 100 60" className="bat-flap">
            <BatShape color={dark ? "#A78BFA" : "#4B2E83"} />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function SeasonalLayer() {
  const theme = useSiteTheme();
  if (theme === "christmas") return <Snowfall />;
  if (theme === "halloween") return <Bats />;
  return null;
}
