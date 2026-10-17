import { useId } from "react";
import { useApp } from "@/context/AppContext";
import { SectionDecor } from "./SectionDecor";

// Brand-tinted band (blue → violet → rose, left to right) with wavy top and
// bottom edges, so alternating sections read as distinct blocks instead of one
// long white page. The waves are drawn in the band's own gradient and sit just
// outside it, over the neighbouring sections' padding.
const STOPS = {
  light: ["#EAF1FE", "#F1EDFE", "#FDEEF1"],
  dark: ["#0E1A33", "#161532", "#211427"],
};

function Wave({ edge, stops }) {
  const id = useId().replace(/:/g, "");
  const top = edge === "top";
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none"
      className={`absolute left-0 w-full h-8 md:h-14 pointer-events-none ${top ? "bottom-[calc(100%-1px)]" : "top-[calc(100%-1px)]"}`}>
      <defs>
        <linearGradient id={`wb${id}`} x1="0" y1="0" x2="1" y2="0">
          {stops.map((s, i) => <stop key={s} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={s} />)}
        </linearGradient>
      </defs>
      <path fill={`url(#wb${id})`}
        d={top
          ? "M0 60V34C160 6 330 4 520 22s380 40 560 22S1330 2 1440 18V60Z"
          : "M0 0V24c170 30 350 34 540 14s370-38 560-20 260 30 340 18V0Z"} />
    </svg>
  );
}

export function WaveBand({ decor, id, className = "", children }) {
  const { dark } = useApp();
  const stops = dark ? STOPS.dark : STOPS.light;
  return (
    <section id={id} className={`relative my-8 md:my-14 ${className}`} style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }}>
      <Wave edge="top" stops={stops} />
      {decor && <SectionDecor variant={decor} />}
      <div className="relative">{children}</div>
      <Wave edge="bottom" stops={stops} />
    </section>
  );
}
