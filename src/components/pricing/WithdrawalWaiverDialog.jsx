import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { pathForRoute } from "@/constants/seo";

// Asks for the one thing CGU section 7 depends on and the purchase flow never
// used to collect: the buyer's express request for immediate access, and their
// acknowledgement that it costs them the right of withdrawal.
//
// For a distance contract over digital content that request has to come from
// the consumer BEFORE performance begins, and the trader has to be able to show
// it was made. Section 7 asserted it; nothing asked for it. A pass was
// therefore sold as non-refundable on a footing that did not exist.
//
// Deliberately not a pre-ticked box and not buried in the plan card: an
// acknowledgement obtained by default is the same as no acknowledgement. The
// confirm button stays disabled until the box is ticked, and the server refuses
// the checkout session without the flag regardless of what this component does
// (api/create-checkout-session.js).
export function WithdrawalWaiverDialog({ open, planName, onClose, onConfirm }) {
  const { c, t } = useApp();
  const [checked, setChecked] = useState(false);

  // Every purchase is its own acknowledgement, so the box never starts ticked —
  // including the second time the sheet is opened in one session.
  useEffect(() => { if (open) setChecked(false); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body> for the same reason as TermsDialog: the plan card sits
  // on a `.rise` layer whose finished transform would otherwise become the
  // containing block for anything `fixed` inside this sheet.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={t("Accès immédiat et droit de rétractation")}>
      <div className={`w-full max-w-lg rounded-3xl border ${c.border} ${c.card} shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${c.border}`}>
          <h2 className={`font-display font-bold flex-1 ${c.text}`}>{t("Avant de payer")}</h2>
          <button onClick={onClose} aria-label={t("Fermer")} className={`p-1.5 rounded-full ${c.hoverSoft} ${c.sub}`}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className={`text-sm ${c.sub}`}>
            {t("Votre accès")} {planName ? <span className={`font-semibold ${c.text}`}>{planName}</span> : null} {t("est ouvert immédiatement après le paiement, sans attendre.")}
          </p>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{t("En contrepartie de cet accès immédiat, vous renoncez à votre droit de rétractation de 14 jours : un pass déjà ouvert n'est plus remboursable.")}</span>
            </p>
          </div>

          <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${c.border} ${c.hoverSoft}`}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600" />
            <span className={`text-sm ${c.text}`}>
              {t("Je demande expressément l'accès immédiat au contenu et je reconnais perdre, de ce fait, mon droit de rétractation.")}
            </span>
          </label>

          <p className={`text-xs ${c.faint}`}>
            {t("Détail à l'article 7 des")}{" "}
            <a href={pathForRoute("terms")} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
              {t("conditions générales")}
            </a>
            {t(". Le remboursement reste dû en cas de double facturation ou d'erreur de notre part.")}
          </p>
        </div>

        <div className={`px-6 py-4 border-t ${c.border} flex items-center justify-end gap-3`}>
          <Btn small variant="ghost" onClick={onClose}>{t("Annuler")}</Btn>
          <Btn small icon={Check} variant="accent" disabled={!checked} onClick={onConfirm}>{t("Continuer vers le paiement")}</Btn>
        </div>
      </div>
    </div>,
    document.body,
  );
}
