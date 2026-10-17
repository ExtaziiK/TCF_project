import { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { BRAND, DotGrid, DashedRing, Ring, Dot, Blob, Squiggle, Cross, Triangle, GradientCircle } from "./shapes";

const { blue, violet, red, amber } = BRAND;

// One layout per section: [Shape, props, position classes, animation class,
// parallax depth (px of mouse travel; 0 = none)]. Shapes hug the left and right
// edges so they fill the empty sides on wide screens without crowding content.
// Each layout mixes outline shapes with one or two solid gradient discs (and an
// amber accent) so the sides read as colourful, not as faint watermarks.
const LAYOUTS = {
  hero: [
    [GradientCircle, { from: amber, to: red, size: 78 }, "top-24 left-[6%]", "decor-float", 22],
    [DotGrid, { color: blue, n: 9, r: 2.6 }, "top-[42%] left-[2%]", "decor-float-slow", 14],
    [DashedRing, { color: red, size: 130, stroke: 7 }, "bottom-20 left-[5%] opacity-80", "decor-spin", 10],
    [Squiggle, { color: violet, stroke: 5 }, "top-[30%] left-[15%] opacity-90", "decor-drift", 26],
    [Blob, { color: violet, size: 240 }, "top-16 -right-16 opacity-[.16]", "decor-morph", 8],
    [GradientCircle, { from: blue, to: violet, size: 54 }, "top-40 right-[12%]", "decor-float", 30],
    [DotGrid, { color: red, n: 8, r: 2.6 }, "bottom-16 right-[3%]", "decor-float-slow", 16],
    [Cross, { color: amber, size: 26, stroke: 5 }, "top-[60%] right-[9%]", "decor-spin-rev", 34],
  ],
  features: [
    [DashedRing, { color: blue, size: 110, stroke: 7 }, "top-24 left-[2%] opacity-80", "decor-spin", 12],
    [GradientCircle, { from: violet, to: red, size: 46 }, "top-[50%] left-[7%]", "decor-float", 26],
    [Triangle, { color: amber, size: 40, stroke: 4 }, "bottom-[18%] left-[3%]", "decor-spin-slow", 20],
    [DotGrid, { color: violet, n: 8, r: 2.6 }, "top-[30%] right-[2%]", "decor-float-slow", 14],
    [Cross, { color: red, size: 26, stroke: 5 }, "bottom-[16%] right-[8%] opacity-90", "decor-spin-rev", 28],
  ],
  overview: [
    [DotGrid, { color: blue, n: 7, r: 2.6 }, "top-16 left-[2%]", "decor-float", 16],
    [Squiggle, { color: red, width: 100, stroke: 5 }, "bottom-16 left-[4%] opacity-90", "decor-drift", 22],
    [GradientCircle, { from: amber, to: red, size: 64 }, "top-14 right-[5%]", "decor-float-slow", 18],
    [Ring, { color: violet, size: 54, stroke: 5 }, "bottom-24 right-[4%] opacity-85", "decor-float", 24],
  ],
  testimonials: [
    [Blob, { color: red, size: 210 }, "top-12 -left-16 opacity-[.14]", "decor-morph", 8],
    [GradientCircle, { from: blue, to: violet, size: 50 }, "top-[58%] left-[5%]", "decor-float", 26],
    [DashedRing, { color: violet, size: 120, stroke: 7 }, "top-24 right-[3%] opacity-80", "decor-spin", 12],
    [Cross, { color: amber, size: 26, stroke: 5 }, "bottom-16 right-[9%]", "decor-spin-rev", 30],
  ],
  calculator: [
    [DotGrid, { color: red, n: 8, r: 2.6 }, "top-20 left-[2%]", "decor-float-slow", 16],
    [Ring, { color: amber, size: 46, stroke: 6 }, "bottom-24 left-[7%]", "decor-float", 28],
    [GradientCircle, { from: violet, to: blue, size: 58 }, "top-24 right-[5%]", "decor-float", 22],
    [Squiggle, { color: blue, width: 110, stroke: 5 }, "bottom-20 right-[2%] opacity-90", "decor-drift", 20],
  ],
  pricing: [
    [DashedRing, { color: red, size: 120, stroke: 7 }, "top-28 left-[2%] opacity-80", "decor-spin", 12],
    [Dot, { color: amber, size: 18 }, "top-[55%] left-[6%]", "decor-pulse", 30],
    [DotGrid, { color: blue, n: 8, r: 2.6 }, "top-[35%] right-[2%]", "decor-float", 16],
    [GradientCircle, { from: red, to: amber, size: 48 }, "bottom-24 right-[7%]", "decor-float-slow", 26],
  ],
  cta: [
    [Blob, { color: blue, size: 220, variant: 1 }, "top-6 left-[4%] opacity-[.14]", "decor-morph", 10],
    [GradientCircle, { from: amber, to: red, size: 56 }, "bottom-10 left-[13%]", "decor-float", 18],
    [Blob, { color: red, size: 200 }, "bottom-4 right-[5%] opacity-[.14]", "decor-morph", 10],
    [Squiggle, { color: violet, width: 100, stroke: 5 }, "top-14 right-[13%] opacity-90", "decor-drift", 24],
  ],
  page: [
    [DotGrid, { color: blue, n: 8, r: 2.6 }, "top-28 left-[2%]", "decor-float", 16],
    [GradientCircle, { from: amber, to: red, size: 50 }, "top-[360px] left-[6%]", "decor-float-slow", 20],
    [Blob, { color: violet, size: 200, variant: 1 }, "top-24 -right-14 opacity-[.14]", "decor-morph", 8],
    [Cross, { color: red, size: 26, stroke: 5 }, "top-[360px] right-[5%] opacity-90", "decor-spin-rev", 26],
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
  const { dark } = useApp();
  useParallax();
  const items = LAYOUTS[variant] || [];
  const show = { md: "hidden md:block", lg: "hidden lg:block", xl: "hidden xl:block", "2xl": "hidden 2xl:block" }[from];
  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${show} ${dark ? "opacity-80" : ""}`}>
      {items.map(([Shape, props, pos, anim, depth], i) => (
        <span key={i} className={`absolute ${pos}`}
          style={depth ? { transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`, transition: "transform .6s cubic-bezier(.22,1,.36,1)" } : undefined}>
          <span className={`block ${anim}`} style={{ animationDelay: `${-i * 1.7}s` }}><Shape {...props} /></span>
        </span>
      ))}
    </div>
  );
}
