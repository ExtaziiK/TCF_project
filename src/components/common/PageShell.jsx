import { SectionHead } from "@/components/common/SectionHead";

export function PageShell({ eyebrow, title, sub, children, wide }) {
  return (
    <main className={`${wide ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 pt-28 md:pt-32 pb-20 rise`}>
      <SectionHead eyebrow={eyebrow} title={title} sub={sub} />
      {children}
    </main>
  );
}
