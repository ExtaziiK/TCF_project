import { createContext, useContext } from "react";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SectionHead } from "@/components/common/SectionHead";
import { SectionDecor } from "@/components/decor/SectionDecor";
import { toolTone } from "@/components/home/toolsData";

// `top` renders above the page heading — for a breadcrumb, which belongs
// before the <h1> both visually and for a crawler reading the document order.
// `tone` + `icon` give a tool page its identity: a filled icon in the tool's
// colour above the heading, and the content inside a panel tinted with that
// colour. The panel exposes the colour as `--tool-fill`, which selected tabs
// and chips inside it use (bg-[var(--tool-fill,…)]), so they match the tool.
//
// Inside EmbeddedShell (the Pratique hub's sheet) a page renders compactly: no
// page frame, side decor, back link, eyebrow or tool panel — the hub already
// supplies them — just a smaller heading above its content.
export const EmbeddedShell = createContext(false);

export function PageShell({ eyebrow, title, sub, children, wide, back, tight, center, big, aside, top, tone, icon: Icon }) {
  const { back: goBack, t, dark } = useApp();
  const embedded = useContext(EmbeddedShell);
  const k = tone && !embedded ? toolTone(tone, dark) : null;
  if (embedded) {
    return (
      <div>
        {top}
        <SectionHead title={title} sub={sub} tight center={center} aside={aside} />
        {children}
      </div>
    );
  }
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
      {Icon && k && (
        <span className={`grid place-items-center w-12 h-12 rounded-2xl text-white mb-4 ${center ? "mx-auto" : ""}`}
          style={{ background: k.fill, boxShadow: `0 12px 24px -10px ${k.fill}99` }} aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
      <SectionHead as="h1" eyebrow={eyebrow} title={title} sub={sub} tight={tight} center={center} big={big} aside={aside} />
      {k ? (
        <div className="rounded-[28px] border-2 p-3 sm:p-5 md:p-6" style={{ background: k.panel, borderColor: k.edge, "--tool-fill": k.fill }}>
          {children}
        </div>
      ) : children}
    </main>
    </div>
  );
}
