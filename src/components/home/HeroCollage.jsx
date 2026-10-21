import { useApp } from "@/context/AppContext";

// The landing hero's product collage: real screens of the app laid out in 3D
// beside the pitch. Two screens sit at the back along the top, the TCF blanc
// stands large in front on the left, and two smaller screens stack down the
// right; a soft colour glow sits behind them all. The stage is tilted in
// perspective and each screen sits at its own depth (translateZ), so the ones
// in front overlap the ones behind; the whole stage leans a few degrees toward
// the pointer through the --mx / --my variables SectionDecor's parallax
// already writes. Each screen floats on its own slow loop (.hero-float, on an
// inner wrapper so it never fights the depth transform). A Canadian flag,
// drawn as the same kind of slab, floats in front by the TCF blanc. Decorative:
// aria-hidden, hidden below lg where the pitch takes the full width.
//
// Each screen is drawn as a solid slab rather than a card: a thick outline,
// and an extrusion made of one hard shadow per pixel of depth, so the gap
// between the screen and its offset shadow is filled in — a slate-blue edge on
// the dark theme, a soft blue-grey one on the light theme.
//
// Each screen holds both its captures from the start, stacked, and a theme
// switch crossfades between them. Swapping the <img> instead (a new element
// fading in) left some screens blank: inside the 3D stage the browser
// rasterised the new layer before the picture had decoded and never repainted
// it. With both already loaded and painted, the switch is only an opacity
// change.
//
// Screenshots live in src/assets/hero (dark theme), cropped below the app's
// nav bar so no account name shows; light-theme captures of the same screens
// are in src/assets/hero/light/ under the same names. A pair must share its
// proportions (the épreuves light capture is trimmed to the dark one's), or
// one of the two gets cropped in its frame.
const DARK = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });
const LIGHT = import.meta.glob("/src/assets/hero/light/*.webp", { eager: true, query: "?url", import: "default" });
const darkShot = (name) => DARK[`/src/assets/hero/${name}.webp`];
const lightShot = (name) => LIGHT[`/src/assets/hero/light/${name}.webp`] || darkShot(name);

// [screen, position, width, depth px, float delay s] — back to front.
const SCREENS = [
  ["dashboard", "right-[3%] top-0", "w-[43%]", -130, 0],
  ["epreuves", "left-[5%] top-[5%]", "w-[44%]", -100, -3.1],
  ["calculator", "right-0 top-[34%]", "w-[37%]", -20, -2.5],
  ["dictee", "right-[3%] bottom-0", "w-[34%]", 10, -4.4],
  ["tcf-blanc", "left-0 top-[27%]", "w-[61%]", 60, -1.6],
];

// The Canadian flag: red bands at each end (a quarter of the width each), a
// white square in the middle holding the red maple leaf. Proportions 2:1.
function CanadaFlag() {
  return (
    <svg viewBox="0 0 200 100" className="block w-full h-auto">
      <rect width="200" height="100" fill="#FFFFFF" />
      <rect width="50" height="100" fill="#D52B1E" />
      <rect x="150" width="50" height="100" fill="#D52B1E" />
      <path fill="#D52B1E" transform="translate(64 14) scale(0.72)"
        d="M50 3l8 17 9-5-3 25 15-12 4 8 12-2-6 15 6 5-22 16 4 10-23-4v22h-8V76l-23 4 4-10L5 54l6-5-6-15 12 2 4-8 15 12-3-25 9 5Z" />
    </svg>
  );
}

const DEPTH = 6; // thickness of the slab, px
const slab = (color) => Array.from({ length: DEPTH }, (_, i) => `${i + 1}px ${i + 1}px 0 0 ${color}`).join(", ");

export function HeroCollage() {
  const { dark } = useApp();
  const frame = dark
    ? { border: "4px solid #3B4A6B", boxShadow: slab("#22314F"), background: "#0B1222" }
    : { border: "4px solid #14204A", boxShadow: slab("#8FA3C7"), background: "#EDF1F7" };
  return (
    <div aria-hidden="true" className="hidden lg:block relative h-[540px] xl:h-[580px]" style={{ perspective: "1800px" }}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(calc(-16deg + var(--mx, 0) * 4deg)) rotateX(calc(9deg - var(--my, 0) * 3deg)) rotateZ(2deg)",
        }}>
        {/* The glow behind the screens: two soft brand-colour blobs, far back. */}
        <div className="absolute inset-[8%] pointer-events-none" style={{ transform: "translateZ(-220px)" }}>
          <div className="absolute left-[10%] top-[30%] w-[55%] h-[55%] rounded-full blur-3xl" style={{ background: "#2E6BE6", opacity: dark ? 0.45 : 0.3 }} />
          <div className="absolute right-[0%] top-[15%] w-[50%] h-[70%] rounded-full blur-3xl" style={{ background: "#D8354A", opacity: dark ? 0.35 : 0.22 }} />
        </div>
        {SCREENS.map(([name, pos, width, z, delay]) => (
          <div key={name} className={`absolute ${pos} ${width}`} style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
            <div className="hero-float" style={{ animationDelay: `${delay}s` }}>
              {/* The frame holds the outline and the slab; inside, the two
                  captures share one grid cell and crossfade. */}
              <div className="grid rounded-2xl overflow-hidden" style={frame}>
                {[[darkShot(name), dark], [lightShot(name), !dark]].map(([src, on], k) => (
                  <img key={k} src={src} alt="" draggable="false"
                    className={`[grid-area:1/1] block w-full h-full object-cover object-top transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`} />
                ))}
              </div>
            </div>
          </div>
        ))}
        {/* The flag, forward of every screen, by the TCF blanc's left edge. */}
        <div className="absolute -left-[7%] top-[63%] w-[20%]" style={{ transform: "translateZ(170px) rotateZ(-8deg)" }}>
          <div className="hero-float" style={{ animationDelay: "-3.6s" }}>
            <div className="rounded-xl overflow-hidden" style={frame}><CanadaFlag /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
