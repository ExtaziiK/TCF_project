import { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { BRAND, DotGrid, DashedRing, Ring, Dot, Blob, Squiggle, Cross, Triangle } from "./shapes";

const { blue, violet, red } = BRAND;

// One layout per section: [Shape, props, position classes, animation class,
// parallax depth (px of mouse travel; 0 = none)]. Shapes hug the left and right
// edges so they fill the empty sides on wide screens without crowding content.
const LAYOUTS = {
  hero: [
    [DotGrid, { color: blue, n: 9 }, "top-28 left-[3%] opacity-50", "decor-float", 18],
    [DashedRing, { color: red, size: 130 }, "bottom-24 left-[5%] opacity-40", "decor-spin", 10],
    [Squiggle, { color: violet }, "top-[46%] left-[1%] opacity-50", "decor-drift", 24],
    [Cross, { color: red }, "top-40 left-[16%] opacity-50", "decor-spin-rev", 30],
    [Blob, { color: violet, size: 230 }, "top-20 -right-16 opacity-[.07]", "decor-morph", 8],
    [DotGrid, { color: red, n: 8 }, "bottom-20 right-[3%] opacity-45", "decor-float-slow", 16],
    [Ring, { color: blue, size: 44 }, "top-44 right-[14%] opacity-50", "decor-float", 28],
    [Dot, { color: blue, size: 12 }, "top-[58%] right-[8%] opacity-60", "decor-pulse", 34],
  ],
  features: [
    [DashedRing, { color: blue, size: 110 }, "top-16 left-[2%] opacity-35", "decor-spin", 12],
    [Dot, { color: violet, size: 14 }, "top-[48%] left-[7%] opacity-50", "decor-float", 26],
    [Triangle, { color: red }, "bottom-[22%] left-[3%] opacity-45", "decor-spin-slow", 20],
    [DotGrid, { color: violet, n: 8 }, "top-[30%] right-[2%] opacity-40", "decor-float-slow", 14],
    [Cross, { color: blue }, "bottom-[18%] right-[8%] opacity-50", "decor-spin-rev", 28],
  ],
  overview: [
    [DotGrid, { color: blue, n: 7 }, "top-16 left-[2%] opacity-45", "decor-float", 16],
    [Squiggle, { color: red, width: 100 }, "bottom-16 left-[4%] opacity-45", "decor-drift", 22],
    [Blob, { color: blue, size: 180, variant: 1 }, "top-10 -right-12 opacity-[.08]", "decor-morph", 8],
    [Ring, { color: violet, size: 54 }, "bottom-24 right-[4%] opacity-45", "decor-float-slow", 24],
  ],
  testimonials: [
    [Blob, { color: red, size: 200 }, "top-12 -left-16 opacity-[.07]", "decor-morph", 8],
    [Cross, { color: violet }, "top-[60%] left-[5%] opacity-50", "decor-spin-rev", 26],
    [DashedRing, { color: violet, size: 120 }, "top-20 right-[3%] opacity-35", "decor-spin", 12],
    [DotGrid, { color: blue, n: 7 }, "bottom-12 right-[5%] opacity-40", "decor-float", 18],
  ],
  calculator: [
    [DotGrid, { color: red, n: 8 }, "top-20 left-[2%] opacity-40", "decor-float-slow", 16],
    [Ring, { color: blue, size: 40 }, "bottom-24 left-[7%] opacity-50", "decor-float", 28],
    [Triangle, { color: violet, size: 38 }, "top-24 right-[5%] opacity-45", "decor-spin-slow", 22],
    [Squiggle, { color: blue, width: 110 }, "bottom-20 right-[2%] opacity-45", "decor-drift", 20],
  ],
  pricing: [
    [DashedRing, { color: red, size: 120 }, "top-24 left-[2%] opacity-35", "decor-spin", 12],
    [Dot, { color: blue, size: 14 }, "top-[55%] left-[6%] opacity-55", "decor-pulse", 30],
    [DotGrid, { color: blue, n: 8 }, "top-[35%] right-[2%] opacity-40", "decor-float", 16],
    [Cross, { color: red }, "bottom-24 right-[7%] opacity-50", "decor-spin-rev", 26],
  ],
  cta: [
    [Blob, { color: blue, size: 220, variant: 1 }, "top-6 left-[4%] opacity-[.08]", "decor-morph", 10],
    [DotGrid, { color: violet, n: 7 }, "bottom-8 left-[12%] opacity-40", "decor-float", 18],
    [Blob, { color: red, size: 200 }, "bottom-4 right-[5%] opacity-[.08]", "decor-morph", 10],
    [Squiggle, { color: red, width: 100 }, "top-12 right-[13%] opacity-45", "decor-drift", 24],
  ],
  page: [
    [DotGrid, { color: blue, n: 8 }, "top-28 left-[2%] opacity-40", "decor-float", 16],
    [DashedRing, { color: red, size: 110 }, "top-[340px] left-[5%] opacity-30", "decor-spin", 12],
    [Blob, { color: violet, size: 200, variant: 1 }, "top-24 -right-14 opacity-[.07]", "decor-morph", 8],
    [Cross, { color: blue }, "top-[360px] right-[5%] opacity-45", "decor-spin-rev", 26],
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
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${show} ${dark ? "opacity-60" : ""}`}>
      {items.map(([Shape, props, pos, anim, depth], i) => (
        <span key={i} className={`absolute ${pos}`}
          style={depth ? { transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`, transition: "transform .6s cubic-bezier(.22,1,.36,1)" } : undefined}>
          <span className={`block ${anim}`} style={{ animationDelay: `${-i * 1.7}s` }}><Shape {...props} /></span>
        </span>
      ))}
    </div>
  );
}

// A full-width wrapper that gives a section its own side decorations.
export function Decorated({ variant, className = "", children }) {
  return (
    <div className={`relative ${className}`}>
      <SectionDecor variant={variant} />
      <div className="relative">{children}</div>
    </div>
  );
}
