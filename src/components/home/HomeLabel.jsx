import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getHomeLabel } from "@/services/settingsService";
import { sanitizeRichText, richTextHasContent } from "@/utils/richText";

// A short signature of the banner content, so a visitor's "dismiss" only hides
// the message they actually saw — change the text and the banner returns.
const DISMISS_KEY = "passerelle.homeLabelDismissed";
function sig(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

// Which corner of the viewport the banner is pinned to. Top corners sit clear
// of the fixed navbar (+ announcement bar).
const CORNER = {
  "top-left": "top-28 md:top-32 left-4 md:left-6",
  "top-right": "top-28 md:top-32 right-4 md:right-6",
  "bottom-left": "bottom-4 md:bottom-6 left-4 md:left-6",
  "bottom-right": "bottom-4 md:bottom-6 right-4 md:right-6",
};

// Admin-editable announcement banner on the public landing page. Stays hidden
// until an admin enables it with some text (Admin › Accueil). Read with the
// anon key so logged-out visitors see it. The admin picks the page corner it
// floats in and its opacity.
export function HomeLabel() {
  const { c } = useApp();
  const [cfg, setCfg] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let on = true;
    getHomeLabel().then((v) => {
      if (!on) return;
      setCfg(v);
      try { setDismissed(localStorage.getItem(DISMISS_KEY) === sig(v.text)); } catch { /* private mode */ }
    });
    return () => { on = false; };
  }, []);

  if (!cfg || !cfg.enabled || dismissed || !richTextHasContent(cfg.text)) return null;

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, sig(cfg.text)); } catch { /* private mode: just closes for now */ }
  };

  return (
    <div className={`fixed z-30 w-[calc(100vw-2rem)] max-w-sm rise ${CORNER[cfg.position] || CORNER["bottom-right"]}`} style={{ opacity: cfg.opacity }}>
      <div className={`flex items-start gap-3 rounded-2xl border-2 border-blue-600/30 ${c.card} px-4 py-3 text-left shadow-xl`}>
        <Megaphone size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className={`text-sm leading-relaxed flex-1 ${c.text}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(cfg.text) }} />
        <button onClick={close} aria-label="Fermer" className={`shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg ${c.hoverSoft} ${c.faint}`}><X size={15} /></button>
      </div>
    </div>
  );
}
