import { useApp } from "@/context/AppContext";

// Themed "stickers" that fill the empty sides of the landing page: French
// speech bubbles, accented letter tiles, level tags, maple leaves and a
// paper-plane flight path (the passerelle to Canada). Flat colours only — no
// gradients, no blur. SectionDecor places and animates them; `tilt` is a
// static rotation in degrees.

export const BRAND = { blue: "#2E6BE6", violet: "#6C4FE0", red: "#D8354A", amber: "#F5A524" };

// Flat pastel backgrounds matching each brand colour, light and dark.
const SOFT = {
  light: { [BRAND.blue]: "#E2EBFD", [BRAND.violet]: "#ECE7FD", [BRAND.red]: "#FCE5EA", [BRAND.amber]: "#FDEFD6" },
  dark: { [BRAND.blue]: "#13234A", [BRAND.violet]: "#1F1B4D", [BRAND.red]: "#3A1724", [BRAND.amber]: "#3A2A0E" },
};
// A darker shade of each colour for the letter tiles' bottom edge.
const DEEP = { [BRAND.blue]: "#1F4FB3", [BRAND.violet]: "#4E35B5", [BRAND.red]: "#A9243A", [BRAND.amber]: "#C9821A" };

function useSoft() {
  const { dark } = useApp();
  return { soft: SOFT[dark ? "dark" : "light"], dark };
}

// Speech bubble with a short French phrase. `solid` fills it with the colour.
export function Bubble({ text, color, solid, tail = "left", tilt = 0 }) {
  const { soft, dark } = useSoft();
  const bg = solid ? color : dark ? "#0F172A" : "#FFFFFF";
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="px-4 py-2.5 rounded-2xl font-display font-bold text-sm whitespace-nowrap border-2"
        style={{ background: bg, color: solid ? "#FFFFFF" : color, borderColor: color, boxShadow: `4px 4px 0 ${soft[color]}` }}>
        {text}
      </div>
      <span className={`absolute -bottom-[7px] ${tail === "left" ? "left-5" : "right-5"} w-3.5 h-3.5 rotate-45 border-b-2 border-r-2`}
        style={{ background: bg, borderColor: color }} />
    </div>
  );
}

// Scrabble-style tile with an accented letter and a small score.
export function Tile({ ch, pts = 1, color, tilt = 0 }) {
  return (
    <div className="relative w-12 h-12 rounded-xl grid place-items-center font-display font-extrabold text-2xl text-white"
      style={{ background: color, boxShadow: `0 4px 0 ${DEEP[color]}`, transform: `rotate(${tilt}deg)` }}>
      {ch}
      <span className="absolute bottom-0.5 right-1.5 text-[10px] font-bold opacity-80">{pts}</span>
    </div>
  );
}

// Level / score tag ("NCLC 7", "C1", "699 pts").
export function Tag({ text, color, tilt = 0 }) {
  const { soft } = useSoft();
  return (
    <div className="px-3.5 py-1.5 rounded-full font-display font-extrabold text-xs tracking-wide whitespace-nowrap"
      style={{ background: soft[color], color, transform: `rotate(${tilt}deg)` }}>
      {text}
    </div>
  );
}

export function Maple({ color, size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <path fill={color}
        d="M50 3l8 17 9-5-3 25 15-12 4 8 12-2-6 15 6 5-22 16 4 10-23-4v22h-8V76l-23 4 4-10L5 54l6-5-6-15 12 2 4-8 15 12-3-25 9 5Z" />
    </svg>
  );
}

// Dashed flight path ending in a paper plane; the dashes travel along it.
export function Flight({ color, width = 220, flip, tilt = 0 }) {
  return (
    <svg width={width} height={width / 2} viewBox="0 0 220 110" fill="none"
      style={{ transform: `${flip ? "scaleX(-1) " : ""}rotate(${tilt}deg)` }}>
      <path className="decor-dash" d="M6 102C56 104 62 40 112 46s70 34 86-20" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="2 9" />
      <g transform="translate(192 4) rotate(20)">
        <path d="M0 12 26 0 18 26 12 16Z" fill={color} />
        <path d="M12 16 26 0" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
