import { ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SectionHead } from "@/components/common/SectionHead";
import { SectionDecor } from "@/components/decor/SectionDecor";

// `top` renders above the page heading — for a breadcrumb, which belongs
// before the <h1> both visually and for a crawler reading the document order.
export function PageShell({ eyebrow, title, sub, children, wide, back, tight, center, big, aside, top }) {
  const { back: goBack, t } = useApp();
  // Side decorations fill the empty margins beside the content column, so they
  // only appear once the screen is wider than that column.
  return (
    <div className="relative">
    <SectionDecor variant="page" from={wide ? "2xl" : "xl"} />
    <main className={`relative ${wide ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 rise ${tight ? "pt-24 md:pt-24 pb-10" : "pt-28 md:pt-32 pb-20"}`}>
      {top}
      {back && (
        <button onClick={() => goBack?.()} className={`text-sm font-semibold text-blue-600 flex items-center gap-1 ${tight ? "mb-3" : "mb-6"}`}>
          <ChevronLeft size={15} /> {t("Retour")}
        </button>
      )}
      <SectionHead as="h1" eyebrow={eyebrow} title={title} sub={sub} tight={tight} center={center} big={big} aside={aside} />
      {children}
    </main>
    </div>
  );
}
