import { ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SectionHead } from "@/components/common/SectionHead";

export function PageShell({ eyebrow, title, sub, children, wide, back }) {
  const { back: goBack, t } = useApp();
  return (
    <main className={`${wide ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 pt-28 md:pt-32 pb-20 rise`}>
      {back && (
        <button onClick={() => goBack?.()} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-6">
          <ChevronLeft size={15} /> {t("Retour")}
        </button>
      )}
      <SectionHead eyebrow={eyebrow} title={title} sub={sub} />
      {children}
    </main>
  );
}
