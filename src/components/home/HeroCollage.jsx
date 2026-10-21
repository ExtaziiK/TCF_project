import { useApp } from "@/context/AppContext";

// The landing hero's product collage, after Brevo's: real screens of the app
// stacked in 3D beside the pitch. The stage is tilted in perspective and each
// screen sits at its own depth (translateZ), so the ones in front overlap the
// ones behind like cards on a desk; the whole stage leans a few degrees toward
// the pointer through the --mx / --my variables SectionDecor's parallax already
// writes. Each card also floats on its own slow loop (.hero-float, on an inner
// wrapper so it never fights the depth transform). Decorative: aria-hidden,
// hidden below lg where the pitch takes the full width.
//
// Screenshots live in src/assets/hero (dark theme), cropped below the app's
// nav bar so no account name shows. Light-theme captures of the same screens
// go in src/assets/hero/light/ under the same file names: each one found there
// is shown in light mode, and a screen without one keeps its dark capture. The
// frames (outline, shadow) follow the theme either way.
const DARK = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });
const LIGHT = import.meta.glob("/src/assets/hero/light/*.webp", { eager: true, query: "?url", import: "default" });
const shot = (name, dark) => (!dark && LIGHT[`/src/assets/hero/light/${name}.webp`]) || DARK[`/src/assets/hero/${name}.webp`];

// [screen, position, width, depth px, float delay s] — back to front. The TCF
// blanc is the centrepiece and the largest; the others vary around it.
const CARDS = [
  ["dashboard", "right-0 top-0", "w-[54%]", -120, 0],
  ["epreuves", "left-0 top-[5%]", "w-[42%]", -70, -3.1],
  ["tcf-blanc", "left-[17%] top-[19%]", "w-[60%]", 10, -1.6],
  ["dictee", "left-0 bottom-[3%]", "w-[36%]", 70, -4.4],
  ["calculator", "right-[1%] bottom-0", "w-[40%]", 120, -2.5],
];

export function HeroCollage() {
  const { dark } = useApp();
  // A clear outline on every card, and a shadow tuned to the background:
  // deep on the dark hero, soft and bluish on the light one.
  const frame = dark
    ? { border: "2px solid rgba(148,163,184,.35)", boxShadow: "0 30px 60px -20px rgba(2,6,23,.7)" }
    : { border: "2px solid #C7D2E3", boxShadow: "0 30px 60px -24px rgba(30,58,138,.35)" };
  return (
    <div aria-hidden="true" className="hidden lg:block relative h-[540px] xl:h-[580px]" style={{ perspective: "1800px" }}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(calc(-16deg + var(--mx, 0) * 4deg)) rotateX(calc(7deg - var(--my, 0) * 3deg)) rotateZ(1.5deg)",
        }}>
        {CARDS.map(([name, pos, width, z, delay]) => (
          <div key={name} className={`absolute ${pos} ${width}`} style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
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
