import { useId } from "react";
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

// Seasonal themes (decor/themes.jsx) bring colours outside the brand four: their
// pastel and deep shades are mixed on the fly instead of looked up.
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => "#" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const softOf = (color, dark) => SOFT[dark ? "dark" : "light"][color] || (dark ? mix(color, "#0F172A", 0.75) : mix(color, "#FFFFFF", 0.84));
const deepOf = (color) => DEEP[color] || mix(color, "#000000", 0.25);

function useSoft() {
  const { dark } = useApp();
  return { soft: (color) => softOf(color, dark), dark };
}

// Speech bubble with a short French phrase. `solid` fills it with the colour.
export function Bubble({ text, color, solid, tail = "left", tilt = 0 }) {
  const { soft, dark } = useSoft();
  const bg = solid ? color : dark ? "#0F172A" : "#FFFFFF";
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="px-4 py-2.5 rounded-2xl font-display font-bold text-sm whitespace-nowrap border-2"
        style={{ background: bg, color: solid ? "#FFFFFF" : color, borderColor: color, boxShadow: `4px 4px 0 ${soft(color)}` }}>
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
      style={{ background: color, boxShadow: `0 4px 0 ${deepOf(color)}`, transform: `rotate(${tilt}deg)` }}>
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
      style={{ background: soft(color), color, transform: `rotate(${tilt}deg)` }}>
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

// Dashed flight path ending in a paper plane (or, for Halloween, a bat; for
// the 1er Novembre, the Algerian flag); the
// dashes travel along it.
export function Flight({ color, width = 220, flip, tilt = 0, lead = "plane" }) {
  return (
    <svg width={width} height={width / 2} viewBox="0 0 220 110" fill="none" overflow="visible"
      style={{ transform: `${flip ? "scaleX(-1) " : ""}rotate(${tilt}deg)` }}>
      <path className="decor-dash" d="M6 102C56 104 62 40 112 46s70 34 86-20" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="2 9" />
      {lead === "bat" ? (
        <g transform="translate(176 8) scale(.44)"><BatShape color={color} /></g>
      ) : lead === "flag" ? (
        <g transform="translate(194.5 -1) scale(.3)"><FlagShape /></g>
      ) : (
        <g transform="translate(192 4) rotate(20)">
          <path d="M0 12 26 0 18 26 12 16Z" fill={color} />
          <path d="M12 16 26 0" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/* ── Halloween ──────────────────────────────────────────────────────────────
 * Same signature as Maple ({ color, size, tilt }), so a theme can put them in
 * the leaves' places. */

// Alive: the eyes blink, and every few seconds it stretches up, swaps its grin
// for a round "O" and lets out a "Boo !". Stickers sharing a page are put out of
// step by their tilt (booDelay). Under prefers-reduced-motion it rests on the grin (the
// "O" and the "Boo !" are hidden by default, not by the animation).
// Puts stickers sharing a page out of step (Pumpkin, Ghost), keyed on the tilt.
const booDelay = (tilt) => ({ animationDelay: `${-((Math.abs(tilt) * 0.37) % 4.2).toFixed(2)}s` });

export function Pumpkin({ color = "#EA6A12", size = 56, tilt = 0 }) {
  const deep = deepOf(color);
  const delay = booDelay(tilt);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" overflow="visible" style={{ transform: `rotate(${tilt}deg)` }}>
      <g className="boo-boo" style={delay}>
        <path d="M50 30c-1-9 2-17 10-22" stroke="#3F7D2C" strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx="31" cy="62" rx="23" ry="30" fill={deep} />
        <ellipse cx="69" cy="62" rx="23" ry="30" fill={deep} />
        <ellipse cx="50" cy="62" rx="24" ry="33" fill={color} />
        <g fill="#2A1606">
          <g className="boo-blink">
            <path d="M31 56l7-11 7 11Z" />
            <path d="M55 56l7-11 7 11Z" />
          </g>
          <path className="boo-grin" style={delay} d="M30 68c7 13 33 13 40 0-4 2-7 3-10 2l-3 4-4-4-4 4-4-4-3 4-3-4c-3 1-6 0-9-2Z" />
          <ellipse className="boo-o" style={delay} cx="50" cy="73" rx="8" ry="10" opacity="0" />
        </g>
      </g>
      <text className="boo-say" style={delay} x="0" y="22" opacity="0" fill={color}
        fontFamily="inherit" fontWeight="800" fontSize="19">Boo !</text>
    </svg>
  );
}

// Same life as the pumpkin: blinks, and on the same loop rises, opens its
// mouth wide and says "Boo !".
export function Ghost({ color, size = 56, tilt = 0 }) {
  const { dark } = useApp();
  const delay = booDelay(tilt);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" overflow="visible" style={{ transform: `rotate(${tilt}deg)` }}>
      <g className="boo-boo" style={delay}>
        <path d="M22 90V46a28 28 0 0 1 56 0v44l-9-8-9 8-10-8-10 8-9-8Z" fill={dark ? "#E9E7F7" : "#FFFFFF"}
          stroke={color} strokeWidth="5" strokeLinejoin="round" />
        <g fill="#1F1A2E">
          <g className="boo-blink">
            <ellipse cx="40" cy="48" rx="5" ry="7" />
            <ellipse cx="60" cy="48" rx="5" ry="7" />
          </g>
          <ellipse className="boo-mouth" style={delay} cx="50" cy="65" rx="6" ry="5" />
        </g>
      </g>
      <text className="boo-say" style={delay} x="0" y="14" opacity="0" fill={color}
        fontFamily="inherit" fontWeight="800" fontSize="19">Boo !</text>
    </svg>
  );
}

// Drawn in a 100×60 box; shared by the sticker, the bat-led flight path and the
// ambient bats (decor/themes.jsx).
export function BatShape({ color }) {
  return (
    <g>
      <path fill={color}
        d="M50 20 46 12 44 22C36 14 18 12 4 20c8 4 10 10 8 18 6-5 14-4 18 2 4-5 10-4 14 2l6 8 6-8c4-6 10-7 14-2 4-6 12-7 18-2-2-8 0-14 8-18-14-8-32-6-40 2l-2-10Z" />
      <circle cx="47" cy="25" r="1.8" fill="#FFD43B" />
      <circle cx="53" cy="25" r="1.8" fill="#FFD43B" />
    </g>
  );
}

export function Bat({ color, size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" style={{ transform: `rotate(${tilt}deg)` }}>
      <BatShape color={color} />
    </svg>
  );
}

/* ── Christmas ──────────────────────────────────────────────────────────── */

export function Snowflake({ color, size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((a) => (
          <path key={a} transform={`rotate(${a} 50 50)`} d="M50 8v84M50 24l-9-9M50 24l9-9M50 76l-9 9M50 76l9 9" />
        ))}
      </g>
      <circle cx="50" cy="50" r="6" fill={color} />
    </svg>
  );
}

// Five-pointed star path centred on (cx, cy).
const star = (cx, cy, R, r) =>
  "M" + Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 ? r : R;
    return `${(cx + d * Math.cos(a)).toFixed(1)} ${(cy + d * Math.sin(a)).toFixed(1)}`;
  }).join("L") + "Z";
const TREE_STAR = star(50, 13, 10, 4.2);

export function Tree({ color = "#1E8A4C", size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <rect x="44" y="82" width="12" height="13" rx="2" fill="#8B5A2B" />
      <path d="M50 18 74 46H62L82 66H66L86 84H14L34 66H18L38 46H26Z" fill={color} />
      <path d={TREE_STAR} fill="#F4C430" />
      <circle cx="45" cy="42" r="3.5" fill="#D62839" />
      <circle cx="58" cy="58" r="3.5" fill="#F4C430" />
      <circle cx="38" cy="73" r="3.5" fill="#FFFFFF" />
      <circle cx="63" cy="77" r="3.5" fill="#D62839" />
    </svg>
  );
}

export function Gift({ color = "#D62839", size = 56, tilt = 0, ribbon = "#F4C430" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <rect x="17" y="42" width="66" height="50" rx="4" fill={color} />
      <rect x="12" y="32" width="76" height="16" rx="3" fill={deepOf(color)} />
      <rect x="45" y="32" width="10" height="60" fill={ribbon} />
      <path d="M50 32C40 15 23 17 29 28c4 6 14 5 21 4Zm0 0c10-17 27-15 21-4-4 6-14 5-21 4Z" fill={ribbon} />
    </svg>
  );
}

export function Ornament({ color, size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <circle cx="50" cy="9" r="5" stroke="#B8860B" strokeWidth="3" fill="none" />
      <rect x="42" y="14" width="16" height="11" rx="2" fill="#D4A017" />
      <circle cx="50" cy="60" r="34" fill={color} />
      <path d="M17 56q33 16 66 0" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="5" fill="none" />
      <circle cx="37" cy="45" r="6" fill="#FFFFFF" fillOpacity=".5" />
    </svg>
  );
}

// A string of lights drooping between two points, in place of the flight path;
// the bulbs twinkle one after another. Same box as Flight.
const WIRE = [[6, 16], [110, 110], [214, 16]];
const BULBS = Array.from({ length: 8 }, (_, i) => {
  const t = 0.08 + i * 0.12;
  const at = (k) => (1 - t) ** 2 * WIRE[0][k] + 2 * (1 - t) * t * WIRE[1][k] + t ** 2 * WIRE[2][k];
  return [at(0), at(1)];
});
const BULB_COLORS = ["#D62839", "#F4C430", "#1E8A4C", "#2F7FC1"];

export function Garland({ color, width = 220, flip, tilt = 0 }) {
  return (
    <svg width={width} height={width / 2} viewBox="0 0 220 110" fill="none"
      style={{ transform: `${flip ? "scaleX(-1) " : ""}rotate(${tilt}deg)` }}>
      <path d={`M${WIRE[0]}Q${WIRE[1]} ${WIRE[2]}`} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {BULBS.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3} y={y - 1} width="6" height="5" rx="1" fill="#64748B" />
          <ellipse className="decor-twinkle" style={{ animationDelay: `${-i * 0.45}s` }}
            cx={x} cy={y + 11} rx="5" ry="7.5" fill={BULB_COLORS[i % BULB_COLORS.length]} />
        </g>
      ))}
    </svg>
  );
}

/* ── 1er Novembre (Algeria) ─────────────────────────────────────────────────
 * The anniversary of the 1 November 1954 uprising that opened the war of
 * independence — a national day of pride and remembrance, not a party. So the
 * stickers are its own symbols, drawn soberly: the flag (often), its crescent
 * and star, the photograph of the six leaders who launched it, the year itself
 * and an olive branch for the peace that was won.
 * Flag colours are the official ones; nothing here shows weapons or combat. */

export const DZ = { green: "#006233", red: "#D21034", white: "#FFFFFF" };

// Crescent opening to the right: the outer circle (cx, cy, R) minus an inner
// one of radius r shifted right by d. One path, so no mask (and no ids).
const crescent = (cx, cy, R, r, d) => {
  const a = (R * R - r * r + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const x = (cx + a).toFixed(2), y1 = (cy - h).toFixed(2), y2 = (cy + h).toFixed(2);
  return `M${x} ${y1}A${R} ${R} 0 1 0 ${x} ${y2}A${r} ${r} 0 ${a > d ? 1 : 0} 1 ${x} ${y1}Z`;
};
// Five-pointed star turned so a point faces the crescent, as on the flag.
const starTurned = (cx, cy, R, r, turn) =>
  "M" + Array.from({ length: 10 }, (_, i) => {
    const t = (Math.PI / 5) * i - Math.PI / 2 + turn;
    const d = i % 2 ? r : R;
    return `${(cx + d * Math.cos(t)).toFixed(1)} ${(cy + d * Math.sin(t)).toFixed(1)}`;
  }).join("L") + "Z";

// The emblem in a 100×100 box: crescent centred, star inside its horns.
const EMBLEM_CRESCENT = crescent(46, 50, 30, 24, 9);
const EMBLEM_STAR = starTurned(60, 50, 14, 5.6, -Math.PI / 2 - 0.3);

// Flag at 3:2 on a pole, the fly edge rippled. The halves and the emblem are
// drawn flat and clipped to the rippled outline, which reads as a flag in the
// wind at sticker size. Drawn in a 100×100 box; also the lead of the flight
// path (Flight lead="flag").
export function FlagShape() {
  const clip = useId();
  return (
    <g>
      <rect x="10" y="8" width="4" height="88" rx="2" fill="#8A6A3D" />
      <circle cx="12" cy="7" r="4" fill="#C9A227" />
      <clipPath id={clip}>
        <path d="M14 14C34 6 52 22 72 14S92 12 94 14V66C80 60 70 76 52 70S28 58 14 66Z" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="14" y="4" width="40" height="72" fill={DZ.green} />
        <rect x="54" y="4" width="42" height="72" fill={DZ.white} />
        <g transform="translate(54 40) scale(.36) translate(-50 -50)" fill={DZ.red}>
          <path d={EMBLEM_CRESCENT} />
          <path d={EMBLEM_STAR} />
        </g>
      </g>
      <path d="M14 14C34 6 52 22 72 14S92 12 94 14V66C80 60 70 76 52 70S28 58 14 66Z" fill="none" stroke="#0F172A" strokeOpacity=".12" strokeWidth="1.5" />
    </g>
  );
}

export function DzFlag({ size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <FlagShape />
    </svg>
  );
}

export function CrescentStar({ color = DZ.red, size = 56, tilt = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <path d={EMBLEM_CRESCENT} fill={color} />
      <path d={EMBLEM_STAR} fill={color} />
    </svg>
  );
}

// The founding photograph of 1 November 1954 — the six leaders who launched
// the revolution — as a tilted print with « 1954 » written under it. A real
// photo, so it stays a photo in both themes: only the paper follows dark mode.
export function Photo1954({ size = 56, tilt = 0 }) {
  const { dark } = useApp();
  const w = Math.round(size * 2);
  return (
    <div style={{ width: w, padding: Math.round(w * 0.06), paddingBottom: 0, transform: `rotate(${tilt}deg)`,
      background: dark ? "#F1F5F9" : "#FFFFFF", boxShadow: "0 6px 14px rgba(15,23,42,.22)", borderRadius: 3 }}>
      <img src="/decor/six-historiques-1954.jpg" alt="" width={250} height={232} loading="lazy" decoding="async"
        style={{ display: "block", width: "100%", height: "auto", filter: "grayscale(1) contrast(1.05)" }} />
      <p className="font-display font-extrabold text-center leading-none" style={{ color: DZ.green, fontSize: Math.round(w * 0.13), padding: `${Math.round(w * 0.05)}px 0` }}>
        1954
      </p>
    </div>
  );
}

// « 1954 » in the flag's colours: green, then white edged in green, the year's
// last two digits in red — read as one word at sticker size.
export function Year1954({ size = 56, tilt = 0 }) {
  const fs = Math.round(size * 0.78);
  const white = { color: DZ.white, WebkitTextStroke: `${Math.max(1.5, fs / 22)}px ${DZ.green}`, paintOrder: "stroke fill" };
  return (
    <div className="font-display font-extrabold leading-none whitespace-nowrap select-none"
      style={{ fontSize: fs, letterSpacing: "-0.02em", transform: `rotate(${tilt}deg)`, textShadow: "0 3px 0 rgba(15,23,42,.12)" }}>
      <span style={{ color: DZ.green }}>1</span><span style={white}>9</span><span style={{ color: DZ.red }}>54</span>
    </div>
  );
}

export function OliveBranch({ color = DZ.green, size = 56, tilt = 0 }) {
  const leaves = [[30, 70, -40], [38, 58, 35], [44, 50, -45], [52, 40, 30], [57, 33, -50], [65, 24, 25], [70, 18, -35]];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${tilt}deg)` }}>
      <path d="M18 88C34 66 56 40 78 12" stroke="#7A5A30" strokeWidth="3" strokeLinecap="round" fill="none" />
      {leaves.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="11" ry="4.2" fill={color} transform={`rotate(${r} ${x} ${y}) translate(${i % 2 ? 9 : -9} 0)`} />
      ))}
      <ellipse cx="47" cy="60" rx="4" ry="5" fill="#3F4B1F" />
      <ellipse cx="62" cy="40" rx="3.6" ry="4.6" fill="#3F4B1F" />
    </svg>
  );
}
