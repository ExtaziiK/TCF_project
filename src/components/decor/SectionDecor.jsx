import { useEffect } from "react";
import { BRAND, Bubble, Tile, Tag, Maple, Flight } from "./stickers";

const { blue, violet, red, amber } = BRAND;

// One layout per section: [Sticker, props, position classes, animation class,
// parallax depth (px of mouse travel; 0 = none)]. Stickers sit in the empty
// side margins and each section has its own theme: a greeting in the hero,
// scores near the calculator, a flight to Canada in the final call to action.
const LAYOUTS = {
  hero: [
    [Bubble, { text: "Bonjour !", color: blue, tilt: -6 }, "top-28 left-[4%]", "decor-float", 18],
    [Tile, { ch: "É", pts: 3, color: red, tilt: -10 }, "top-[46%] left-[9%]", "decor-sway", 26],
    [Flight, { color: violet, width: 200 }, "bottom-24 left-[2%]", "", 12],
    [Maple, { color: red, size: 60, tilt: 14 }, "top-24 right-[7%]", "decor-sway", 22],
    [Bubble, { text: "On y va ?", color: violet, solid: true, tail: "right", tilt: 5 }, "top-[44%] right-[3%]", "decor-float-slow", 16],
    [Tile, { ch: "Ç", pts: 4, color: amber, tilt: 8 }, "bottom-28 right-[10%]", "decor-sway", 28],
  ],
  features: [
    [Tag, { text: "7 outils", color: violet, tilt: -7 }, "top-24 left-[3%]", "decor-float", 18],
    [Maple, { color: red, size: 50, tilt: 16 }, "top-[52%] left-[6%]", "decor-sway", 24],
    [Bubble, { text: "À vous de jouer !", color: blue, solid: true, tail: "right", tilt: 5 }, "top-28 right-[2%]", "decor-float-slow", 16],
    [Tile, { ch: "È", pts: 2, color: amber, tilt: 9 }, "bottom-[16%] right-[6%]", "decor-sway", 26],
  ],
  overview: [
    [Tag, { text: "699 pts", color: violet, tilt: -6 }, "top-20 left-[3%]", "decor-float", 16],
    [Tile, { ch: "À", pts: 2, color: blue, tilt: 9 }, "bottom-20 left-[6%]", "decor-sway", 24],
    [Maple, { color: amber, size: 52, tilt: -18 }, "top-16 right-[5%]", "decor-sway", 18],
    [Tag, { text: "4 épreuves", color: red, tilt: 5 }, "bottom-24 right-[3%]", "decor-float-slow", 22],
  ],
  testimonials: [
    [Bubble, { text: "Merci !", color: red, tilt: -7 }, "top-24 left-[4%]", "decor-float", 18],
    [Maple, { color: blue, size: 48, tilt: 20 }, "bottom-[18%] left-[8%]", "decor-sway", 26],
    [Bubble, { text: "NCLC 9 obtenu !", color: blue, solid: true, tail: "right", tilt: 6 }, "top-[30%] right-[3%]", "decor-float-slow", 16],
    [Tile, { ch: "Ê", pts: 2, color: violet, tilt: -8 }, "bottom-[16%] right-[8%]", "decor-sway", 24],
  ],
  calculator: [
    [Tag, { text: "NCLC 7", color: blue, tilt: -8 }, "top-20 left-[4%]", "decor-float", 18],
    [Tag, { text: "B2", color: amber, tilt: 6 }, "top-[42%] left-[8%]", "decor-float-slow", 26],
    [Tag, { text: "C1", color: violet, tilt: -4 }, "bottom-24 left-[3%]", "decor-float", 22],
    [Flight, { color: red, width: 180, flip: true }, "top-16 right-[2%]", "", 14],
    [Tag, { text: "699 / 699", color: red, tilt: 7 }, "bottom-28 right-[5%]", "decor-float-slow", 24],
  ],
  pricing: [
    [Bubble, { text: "Essai gratuit", color: amber, tilt: -5 }, "top-28 left-[3%]", "decor-float", 18],
    [Tile, { ch: "Ô", pts: 3, color: blue, tilt: 10 }, "bottom-[22%] left-[8%]", "decor-sway", 26],
    [Maple, { color: red, size: 50, tilt: -12 }, "top-[34%] right-[6%]", "decor-sway", 20],
    [Tag, { text: "Sans carte", color: violet, tilt: 6 }, "bottom-[16%] right-[3%]", "decor-float-slow", 24],
  ],
  cta: [
    [Flight, { color: blue, width: 240 }, "top-10 left-[3%]", "", 14],
    [Maple, { color: red, size: 72, tilt: 12 }, "top-12 right-[8%]", "decor-sway", 22],
    [Bubble, { text: "À bientôt au Canada !", color: red, solid: true, tail: "right", tilt: 4 }, "bottom-14 right-[4%]", "decor-float", 16],
    [Tile, { ch: "É", pts: 3, color: violet, tilt: -9 }, "bottom-16 left-[10%]", "decor-sway", 26],
  ],
  page: [
    [Bubble, { text: "Bonjour !", color: blue, tilt: -6 }, "top-32 left-[3%]", "decor-float", 16],
    [Tile, { ch: "É", pts: 3, color: red, tilt: -8 }, "top-[340px] left-[7%]", "decor-sway", 24],
    [Maple, { color: red, size: 52, tilt: 14 }, "top-28 right-[5%]", "decor-sway", 20],
    [Tag, { text: "TCF Canada", color: violet, tilt: 6 }, "top-[350px] right-[4%]", "decor-float-slow", 22],
  ],
};

// Mouse-follow parallax, like the reference site: one window listener for the
// whole app writes the pointer position (-1…1) into CSS variables that every
// shape's wrapper reads. Skipped for touch screens and reduced motion.
let parallaxOn = false;
function useParallax() {
  useEffect(() => {
    if (parallaxOn || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    parallaxOn = true;
    let frame = 0;
    const root = document.documentElement;
    const onMove = (e) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        root.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
  }, []);
}

// Absolutely positioned decoration layer for a section. The parent must be
// `relative`, and the content placed after it must be positioned (`relative`)
// so it paints on top. Hidden below the `from` breakpoint, where the content
// already fills the width and there are no sides to fill.
export function SectionDecor({ variant, from = "lg" }) {
  useParallax();
  const items = LAYOUTS[variant] || [];
  const show = { md: "hidden md:block", lg: "hidden lg:block", xl: "hidden xl:block", "2xl": "hidden 2xl:block" }[from];
  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${show}`}>
      {items.map(([Sticker, props, pos, anim, depth], i) => (
        <span key={i} className={`absolute ${pos}`}
          style={depth ? { transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`, transition: "transform .6s cubic-bezier(.22,1,.36,1)" } : undefined}>
          <span className={`block ${anim}`} style={{ animationDelay: `${-i * 1.7}s` }}><Sticker {...props} /></span>
        </span>
      ))}
    </div>
  );
}
