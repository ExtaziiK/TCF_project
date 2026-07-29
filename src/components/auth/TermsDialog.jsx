import { useEffect, useRef, useState } from "react";
import { X, Check, ExternalLink } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { TermsBody } from "@/components/legal/TermsBody";
import { pathForRoute } from "@/constants/seo";

// The conditions, shown over the registration form so a half-filled form is
// never lost to a navigation. Confirming here is what unlocks the consent
// checkbox — see AuthPage.
//
// "Read" is taken seriously enough to be honest without being theatre: the
// confirm button stays disabled until the text has actually been scrolled to
// the end. Content short enough not to scroll counts as read immediately,
// otherwise the button could never enable (on a tall screen, or once the draft
// text is replaced by something shorter).
export function TermsDialog({ open, onClose, onAccept }) {
  const { c, t } = useApp();
  const scrollRef = useRef(null);
  const [atEnd, setAtEnd] = useState(false);

  // Re-evaluate on open: the panel has no height until it is mounted, so this
  // is where "does it even scroll?" can first be answered.
  useEffect(() => {
    if (!open) { setAtEnd(false); return; }
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const scrollable = el.scrollHeight - el.clientHeight > 8;
      if (!scrollable) return setAtEnd(true);
      setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 24);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { el.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [open]);

  // Escape closes, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={t("Conditions générales d'utilisation")}>
      <div className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border ${c.border} ${c.card} shadow-2xl overflow-hidden rise`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${c.border} shrink-0`}>
          <h2 className={`font-display font-bold flex-1 ${c.text}`}>{t("Conditions générales d'utilisation")}</h2>
          <a href={pathForRoute("terms")} target="_blank" rel="noreferrer" title={t("Ouvrir dans un nouvel onglet")}
            className={`p-1.5 rounded-full ${c.hoverSoft} ${c.sub}`} aria-label={t("Ouvrir dans un nouvel onglet")}><ExternalLink size={16} /></a>
          <button onClick={onClose} aria-label={t("Fermer")} className={`p-1.5 rounded-full ${c.hoverSoft} ${c.sub}`}><X size={16} /></button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto px-6 py-5 flex-1">
          <TermsBody compact />
        </div>

        <div className={`px-6 py-4 border-t ${c.border} shrink-0 flex items-center justify-between gap-4 flex-wrap`}>
          <p className={`text-xs ${c.faint}`}>
            {atEnd ? t("Vous pouvez maintenant confirmer votre lecture.") : t("Faites défiler jusqu'au bas du texte pour continuer.")}
          </p>
          <Btn small icon={Check} disabled={!atEnd} onClick={onAccept}>{t("J'ai lu les conditions")}</Btn>
        </div>
      </div>
    </div>
  );
}
