import { useApp } from "@/context/AppContext";
import { BRAND, Bubble, Tile, Tag, Maple } from "@/components/decor/stickers";

// The landing hero's product collage, after Brevo's: real screens of the app
// stacked in 3D beside the pitch, with the site's stickers (score tags, a
// speech bubble, letter tiles, a maple leaf) floating in front of them like
// Brevo's annotation chips. The stage is tilted in perspective and everything
// sits at its own depth (translateZ): the screens spread so each stays
// readable, the TCF blanc in the middle as the largest, and the stickers well
// forward of them. The whole stage leans a few degrees toward the pointer
// through the --mx / --my variables SectionDecor's parallax already writes;
// each piece floats on its own slow loop (.hero-float / .decor-*, on an inner
// wrapper so it never fights the depth transform). Decorative: aria-hidden,
// hidden below lg where the pitch takes the full width — the hero's own
// right-hand stickers (SectionDecor) show there instead.
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
  ["dashboard", "right-0 top-[2%]", "w-[47%]", -110, 0],
  ["epreuves", "left-0 top-0", "w-[43%]", -60, -3.1],
  ["tcf-blanc", "left-[21%] top-[22%]", "w-[55%]", 20, -1.6],
  ["dictee", "left-0 bottom-[1%]", "w-[33%]", 80, -4.4],
  ["calculator", "right-0 bottom-0", "w-[40%]", 110, -2.5],
];

// [sticker, position, depth px, animation] — all in front of the screens.
const { blue, violet, red, amber } = BRAND;
const STICKERS = [
  [<Tag key="pts" text="699 pts" color={amber} tilt={6} />, "right-[20%] top-[19%]", 190, "decor-float"],
  [<Bubble key="go" text="On y va ?" color={violet} solid tail="right" tilt={5} />, "left-[38%] -top-[3%]", 170, "decor-float-slow"],
  [<Tile key="a" ch="À" pts={2} color={blue} tilt={-7} />, "-left-[3%] top-[40%]", 160, "decor-sway"],
  [<Tile key="c" ch="Ç" pts={4} color={amber} tilt={8} />, "right-[37%] bottom-[2%]", 200, "decor-sway"],
  [<Tag key="nclc" text="NCLC 9" color={red} tilt={-5} />, "left-[24%] bottom-[30%]", 210, "decor-float"],
  [<Maple key="leaf" color={red} size={44} tilt={14} />, "-right-[2%] top-[44%]", 150, "decor-sway"],
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
          transform: "rotateY(calc(-14deg + var(--mx, 0) * 4deg)) rotateX(calc(6deg - var(--my, 0) * 3deg)) rotateZ(1deg)",
        }}>
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
        {STICKERS.map(([sticker, pos, z, anim], i) => (
          <div key={i} className={`absolute ${pos}`} style={{ transform: `translateZ(${z}px)` }}>
            <div className={anim} style={{ animationDelay: `${-i * 1.7}s` }}>{sticker}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
