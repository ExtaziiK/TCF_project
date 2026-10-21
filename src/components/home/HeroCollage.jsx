import { useApp } from "@/context/AppContext";

// The landing hero's product collage, after Brevo's: real screens of the app
// stacked in 3D beside the pitch. The stage is tilted in perspective and each
// screen sits at its own depth (translateZ), so the ones in front overlap the
// ones behind; the whole stage leans a few degrees toward the pointer through
// the --mx / --my variables SectionDecor's parallax already writes. Each
// screen floats on its own slow loop (.hero-float, on an inner wrapper so it
// never fights the depth transform). Decorative: aria-hidden, hidden below lg
// where the pitch takes the full width.
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
// nav bar so no account name shows. Light-theme captures of the same screens
// go in src/assets/hero/light/ under the same file names: each one found there
// is shown in light mode, and a screen without one keeps its dark capture.
const DARK = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });
const LIGHT = import.meta.glob("/src/assets/hero/light/*.webp", { eager: true, query: "?url", import: "default" });
const darkShot = (name) => DARK[`/src/assets/hero/${name}.webp`];
const lightShot = (name) => LIGHT[`/src/assets/hero/light/${name}.webp`] || darkShot(name);

// [screen, position, width, depth px, float delay s] — back to front. The TCF
// blanc is the centrepiece and the largest; the four corners each get their
// own size so none mirrors another.
const CARDS = [
  ["dashboard", "right-0 top-0", "w-[50%]", -120, 0],
  ["epreuves", "left-0 top-[6%]", "w-[36%]", -70, -3.1],
  ["tcf-blanc", "left-[17%] top-[19%]", "w-[60%]", 10, -1.6],
  ["dictee", "left-[2%] bottom-[2%]", "w-[30%]", 70, -4.4],
  ["calculator", "right-[1%] bottom-0", "w-[42%]", 120, -2.5],
];

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
          transform: "rotateY(calc(-16deg + var(--mx, 0) * 4deg)) rotateX(calc(7deg - var(--my, 0) * 3deg)) rotateZ(1.5deg)",
        }}>
        {CARDS.map(([name, pos, width, z, delay]) => (
          <div key={name} className={`absolute ${pos} ${width}`} style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
            <div className="hero-float" style={{ animationDelay: `${delay}s` }}>
              {/* The frame holds the outline and the slab; inside, the two
                  captures share one grid cell and crossfade. The cell takes
                  the taller one's height and the other covers it, cropped
                  from the top, should their proportions differ a little. */}
              <div className="grid rounded-2xl overflow-hidden" style={frame}>
                {[[darkShot(name), dark], [lightShot(name), !dark]].map(([src, on], k) => (
                  <img key={k} src={src} alt="" draggable="false"
                    className={`[grid-area:1/1] block w-full h-full object-cover object-top transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
