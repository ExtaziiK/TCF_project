import { useApp } from "@/context/AppContext";

// The landing hero's product collage: real screens of the app arranged as a
// curved "cockpit" wall beside the pitch. The TCF blanc faces the visitor in
// the middle, larger and pulled forward; two screens on each side turn in
// toward it (rotateY about their inner edge), like monitors wrapped around a
// desk. The whole wall leans a few degrees toward the pointer through the
// --mx / --my variables SectionDecor's parallax already writes, and each
// screen floats on its own slow loop (.hero-float, on an inner wrapper so it
// never fights the placement transform). Decorative: aria-hidden, hidden below
// lg where the pitch takes the full width.
//
// The screens are drawn flat, not as cards: a thick outline and a hard offset
// shadow with no blur.
//
// Screenshots live in src/assets/hero (dark theme), cropped below the app's
// nav bar so no account name shows. Light-theme captures of the same screens
// go in src/assets/hero/light/ under the same file names: each one found there
// is shown in light mode, and a screen without one keeps its dark capture.
const DARK = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });
const LIGHT = import.meta.glob("/src/assets/hero/light/*.webp", { eager: true, query: "?url", import: "default" });
const shot = (name, dark) => (!dark && LIGHT[`/src/assets/hero/light/${name}.webp`]) || DARK[`/src/assets/hero/${name}.webp`];

// [screen, position + width, transform, transform-origin, float delay s]
const SIDE = 34; // degrees the side screens turn in toward the middle
const CARDS = [
  ["dashboard", "left-0 top-[2%] w-[33%]", `rotateY(${SIDE}deg) translateZ(-30px)`, "right center", -0.8],
  ["epreuves", "left-[2%] bottom-[4%] w-[33%]", `rotateY(${SIDE}deg) translateZ(-30px)`, "right center", -3.4],
  ["dictee", "right-0 top-[5%] w-[33%]", `rotateY(-${SIDE}deg) translateZ(-30px)`, "left center", -2.1],
  ["calculator", "right-[2%] bottom-0 w-[33%]", `rotateY(-${SIDE}deg) translateZ(-30px)`, "left center", -4.6],
  // The centrepiece last, so it paints over the inner edges of the sides.
  ["tcf-blanc", "left-[24%] top-[11%] w-[52%]", "translateZ(70px)", "center", -1.5],
];

export function HeroCollage() {
  const { dark } = useApp();
  const frame = dark
    ? { border: "4px solid #3B4A6B", boxShadow: "12px 12px 0 0 rgba(46,107,230,.45)" }
    : { border: "4px solid #14204A", boxShadow: "12px 12px 0 0 #9DB8F2" };
  return (
    <div aria-hidden="true" className="hidden lg:block relative h-[540px] xl:h-[580px]" style={{ perspective: "1600px" }}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(calc(var(--mx, 0) * 5deg)) rotateX(calc(4deg - var(--my, 0) * 3deg))",
        }}>
        {CARDS.map(([name, place, transform, origin, delay]) => (
          <div key={name} className={`absolute ${place}`} style={{ transform, transformOrigin: origin, transformStyle: "preserve-3d" }}>
            <div className="hero-float" style={{ animationDelay: `${delay}s` }}>
              <img src={shot(name, dark)} alt="" decoding="async" draggable="false"
                className="block w-full h-auto rounded-2xl" style={frame} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
