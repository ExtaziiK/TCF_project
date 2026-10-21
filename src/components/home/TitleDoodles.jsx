// Hand-drawn accents around the landing title: a spark burst at its top-left
// corner, a maple-leaf outline with its own little sparks after "TCF Canada",
// and a curved arrow pointing from the title toward the product collage.
// Flat brand colours, rounded strokes, decorative only (aria-hidden).

const VIOLET = "#6C4FE0";
const BLUE = "#2E6BE6";

// Three short strokes fanning out from one corner.
export function Sparks({ className = "", color = VIOLET }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round">
      <path d="M30 6l4 12" />
      <path d="M8 14l14 10" />
      <path d="M4 34l16-2" />
    </svg>
  );
}

// The maple leaf drawn as an outline in a red-to-pink gradient, with three
// sparks off its top-right. Sized in em so it follows the title's font size.
export function MapleMark({ className = "" }) {
  return (
    <svg viewBox="0 0 130 120" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="maple-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D8354A" />
          <stop offset="1" stopColor="#E879D9" />
        </linearGradient>
      </defs>
      <path stroke="url(#maple-mark)" strokeWidth="6" transform="translate(4 14)"
        d="M50 3l8 17 9-5-3 25 15-12 4 8 12-2-6 15 6 5-22 16 4 10-23-4v22h-8V76l-23 4 4-10L5 54l6-5-6-15 12 2 4-8 15 12-3-25 9 5Z" />
      <g stroke={BLUE} strokeWidth="5">
        <path d="M104 6l-2 12" />
        <path d="M124 18l-12 7" />
        <path d="M126 42l-13-2" />
      </g>
    </svg>
  );
}

// A loose curve ending in an open arrowhead, heading down and to the right.
export function CurvedArrow({ className = "", color = VIOLET }) {
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden="true" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14C40 2 84 10 104 52" />
      <path d="M88 46l16 8 4-18" />
    </svg>
  );
}
