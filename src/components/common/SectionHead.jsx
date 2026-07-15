import { useApp } from "@/context/AppContext";

// `tight` compacts the vertical spacing (margins); `big` scales the title/sub
// up for a hero header. They're independent: a page can have a prominent title
// on compact spacing, or a small sub-head with a tight gap to its content.
// `as` picks the heading level: PageShell passes "h1" for the page title
// (every page needs exactly one h1 for SEO/a11y); mid-page uses stay h2.
export function SectionHead({ eyebrow, title, sub, center, tight, big, as: Tag = "h2" }) {
  const { c } = useApp();
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""} ${tight ? "mb-5" : "mb-10 md:mb-14"}`}>
      {eyebrow && <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 ${tight ? "mb-2" : "mb-3"}`}>{eyebrow}</p>}
      <Tag className={`font-display font-bold ${c.text} ${big ? "text-[31px] md:text-[39px] leading-tight" : "text-3xl md:text-4xl"}`}>{title}</Tag>
      {sub && <p className={`${c.sub} ${tight ? "mt-2" : "mt-4"} ${big ? "text-[18px] md:text-[21px]" : "text-base md:text-lg"}`}>{sub}</p>}
    </div>
  );
}
