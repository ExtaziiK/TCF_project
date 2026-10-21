import epreuves from "@/assets/hero/epreuves.webp";
import dictee from "@/assets/hero/dictee.webp";
import tcfBlanc from "@/assets/hero/tcf-blanc.webp";
import calculator from "@/assets/hero/calculator.webp";

// The landing hero's product collage, after Brevo's: real screens of the app
// stacked in 3D beside the pitch. The stage is tilted in perspective and each
// screen sits at its own depth (translateZ), so the ones in front overlap the
// ones behind like cards on a desk; the whole stage leans a few degrees toward
// the pointer through the --mx / --my variables SectionDecor's parallax already
// writes. Each card also floats on its own slow loop (.hero-float, on an inner
// wrapper so it never fights the depth transform). Decorative: aria-hidden,
// hidden below lg where the pitch takes the full width.
//
// Screenshots live in src/assets/hero, dark theme, cropped below the app's nav
// bar so no account name shows.
const CARDS = [
  // [image, position, width, depth px, float delay s]
  [epreuves, "right-0 top-[2%]", "w-[74%]", -90, 0],
  [dictee, "left-0 top-[6%]", "w-[46%]", -20, -2.2],
  [tcfBlanc, "left-[4%] bottom-0", "w-[42%]", 50, -4.1],
  [calculator, "right-[3%] bottom-[4%]", "w-[52%]", 110, -1.3],
];

export function HeroCollage() {
  return (
    <div aria-hidden="true" className="hidden lg:block relative h-[500px] xl:h-[540px]" style={{ perspective: "1800px" }}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(calc(-16deg + var(--mx, 0) * 4deg)) rotateX(calc(7deg - var(--my, 0) * 3deg)) rotateZ(1.5deg)",
        }}>
        {CARDS.map(([src, pos, width, z, delay]) => (
          <div key={src} className={`absolute ${pos} ${width}`} style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
            <div className="hero-float" style={{ animationDelay: `${delay}s` }}>
              <img src={src} alt="" decoding="async" draggable="false"
                className="block w-full h-auto rounded-2xl border border-white/10 shadow-[0_30px_60px_-20px_rgba(2,6,23,.55)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
