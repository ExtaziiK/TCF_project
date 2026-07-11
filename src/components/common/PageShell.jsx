import { ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SectionHead } from "@/components/common/SectionHead";

export function PageShell({ eyebrow, title, sub, children, wide, back, tight, center, big }) {
  const { back: goBack, t } = useApp();
  return (
    <main className={`${wide ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 rise ${tight ? "pt-24 md:pt-24 pb-10" : "pt-28 md:pt-32 pb-20"}`}>
      {back && (
        <button onClick={() => goBack?.()} className={`text-sm font-semibold text-blue-600 flex items-center gap-1 ${tight ? "mb-3" : "mb-6"}`}>
          <ChevronLeft size={15} /> {t("Retour")}
        </button>
      )}
      <SectionHead eyebrow={eyebrow} title={title} sub={sub} tight={tight} center={center} big={big} />
      {children}
    </main>
  );
}
