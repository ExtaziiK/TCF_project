import { useApp } from "@/context/AppContext";

// Flat coloured shapes behind a grid of white cards, so the cards stand out
// instead of blending into a white section: two offset, slightly tilted
// pastel panels (they show through the gaps between cards) and two solid
// circles peeking out from behind the corners. Flat fills only.
const COLORS = {
  light: { panelA: "#E2EBFD", panelB: "#FCE5EA", dotA: "#F5A524", dotB: "#6C4FE0" },
  dark: { panelA: "#13234A", panelB: "#3A1724", dotA: "#C9821A", dotB: "#4E35B5" },
};

export function CardBackdrop({ children }) {
  const { dark } = useApp();
  const k = COLORS[dark ? "dark" : "light"];
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-4 -left-3 right-[30%] bottom-[35%] sm:-top-6 sm:-left-6 rounded-[2.5rem] -rotate-1"
          style={{ background: k.panelA }} />
        <div className="absolute top-[35%] left-[30%] -right-3 -bottom-4 sm:-right-6 sm:-bottom-6 rounded-[2.5rem] rotate-1"
          style={{ background: k.panelB }} />
        <div className="absolute -top-8 -right-6 w-16 h-16 sm:w-24 sm:h-24 rounded-full" style={{ background: k.dotA }} />
        <div className="absolute -bottom-7 -left-5 w-12 h-12 sm:w-16 sm:h-16 rounded-full" style={{ background: k.dotB }} />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
