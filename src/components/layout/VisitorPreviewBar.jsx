import { Eye, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

// The way out of "aperçu visiteur", and the only thing on screen that knows the
// preview is on — everything else has been handed a signed-out session and is
// rendering accordingly.
//
// Sits at the bottom rather than the top: the announcement bar and the fixed
// nav already negotiate the top edge between them (see AppShell's barOffset),
// and a third bar in that stack would shift the very layout being previewed.
// Down here it overlays nothing that matters and the page above stays pixel-for
// -pixel what a visitor gets.
export function VisitorPreviewBar() {
  const { c, t, visitorPreview, exitVisitorPreview, nav } = useApp();
  if (!visitorPreview) return null;

  const leave = () => { exitVisitorPreview(); nav("home"); };

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full border shadow-2xl backdrop-blur-md ${c.card} ${c.border}`}
      >
        <span className={`flex items-center gap-2 text-sm font-semibold ${c.text}`}>
          <Eye size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
          {t("Aperçu visiteur")}
        </span>
        <span className={`hidden sm:inline text-xs ${c.sub}`}>{t("Ce que voit un internaute sans compte.")}</span>
        <button
          onClick={leave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
        >
          <X size={13} aria-hidden="true" /> {t("Quitter l'aperçu")}
        </button>
      </div>
    </div>
  );
}
