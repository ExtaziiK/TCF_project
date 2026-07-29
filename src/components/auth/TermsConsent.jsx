import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { TermsDialog } from "@/components/auth/TermsDialog";

// The consent gate shown on both paths that create an account: the email
// registration form and the Google onboarding step. Signing up with Google
// skips the registration form entirely, so without this here that route would
// create accounts that never saw the conditions.
//
// The box cannot be ticked until the dialog has been opened AND scrolled
// through — `read` only flips when TermsDialog confirms. The parent owns
// `accepted` because it is the parent's submit that must refuse without it.
export function TermsConsent({ accepted, onChange }) {
  const { c, t } = useApp();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);

  return (
    <>
      <TermsDialog
        open={open}
        onClose={() => setOpen(false)}
        onAccept={() => { setRead(true); onChange(true); setOpen(false); }}
      />
      <div className={`p-4 rounded-2xl border ${read ? c.border : "border-blue-600/40 bg-blue-600/5"}`}>
        <label className={`flex items-start gap-3 text-sm ${read ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}>
          <input type="checkbox" checked={accepted} disabled={!read}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600 disabled:cursor-not-allowed" />
          <span className={c.sub}>
            {t("J'ai lu et j'accepte les")}{" "}
            <button type="button" onClick={() => setOpen(true)} className="font-semibold text-blue-600 hover:underline">
              {t("conditions générales d'utilisation")}
            </button>
            {"."}
          </span>
        </label>
        {!read && <p className={`mt-2 ml-7 text-xs ${c.faint}`}>{t("Ouvrez les conditions pour pouvoir cocher cette case.")}</p>}
      </div>
    </>
  );
}
