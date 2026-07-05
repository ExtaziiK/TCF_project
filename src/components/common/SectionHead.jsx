import { useApp } from "@/context/AppContext";

export function SectionHead({ eyebrow, title, sub, center }) {
  const { c } = useApp();
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""} mb-10 md:mb-14`}>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{eyebrow}</p>}
      <h2 className={`font-display text-3xl md:text-4xl font-bold ${c.text}`}>{title}</h2>
      {sub && <p className={`mt-4 text-base md:text-lg ${c.sub}`}>{sub}</p>}
    </div>
  );
}
