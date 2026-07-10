import { useApp } from "@/context/AppContext";

export function SectionHead({ eyebrow, title, sub, center, tight }) {
  const { c } = useApp();
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""} ${tight ? "mb-5" : "mb-10 md:mb-14"}`}>
      {eyebrow && <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 ${tight ? "mb-2" : "mb-3"}`}>{eyebrow}</p>}
      <h2 className={`font-display font-bold ${c.text} ${tight ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>{title}</h2>
      {sub && <p className={`${c.sub} ${tight ? "mt-2 text-sm md:text-base" : "mt-4 text-base md:text-lg"}`}>{sub}</p>}
    </div>
  );
}
