import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getHomeLabel } from "@/services/settingsService";

// Admin-editable announcement banner on the public landing page. Stays hidden
// until an admin enables it with some text (Admin › Accueil). Read with the
// anon key so logged-out visitors see it. The admin controls its opacity and
// its position on the page (in-flow at the top, or floating at top/bottom).
export function HomeLabel() {
  const { c } = useApp();
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    let on = true;
    getHomeLabel().then((v) => { if (on) setCfg(v); });
    return () => { on = false; };
  }, []);

  if (!cfg || !cfg.enabled || !cfg.text.trim()) return null;

  const banner = (
    <div style={{ opacity: cfg.opacity }} className="flex items-start gap-3 rounded-2xl border border-blue-600/25 bg-blue-600/10 backdrop-blur px-4 py-3 text-left shadow-md">
      <Megaphone size={18} className="text-blue-600 shrink-0 mt-0.5" />
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${c.text}`}>{cfg.text}</p>
    </div>
  );

  // Floating variants escape the hero flow (fixed); the wrapper ignores pointer
  // events so it never blocks the page, while the banner itself stays clickable.
  if (cfg.position === "float-top")
    return <div className="fixed top-16 md:top-[72px] inset-x-0 z-30 px-4 pt-3 pointer-events-none"><div className="max-w-3xl mx-auto pointer-events-auto rise">{banner}</div></div>;
  if (cfg.position === "float-bottom")
    return <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pointer-events-none"><div className="max-w-3xl mx-auto pointer-events-auto rise">{banner}</div></div>;
  // in-flow, at the top of the hero
  return <div className="max-w-3xl mx-auto mb-6 rise">{banner}</div>;
}
