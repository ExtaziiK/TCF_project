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
      {/* Before reading, the WHOLE block is one button that opens the
          conditions — the link alone was a small target for the only action
          available at that point. Afterwards it becomes an ordinary label +
          checkbox, with the link still there to re-open the text. */}
      {read ? (
        <div className={`p-4 rounded-2xl border ${c.border}`}>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600 cursor-pointer" />
            <span className={c.sub}>
              {t("J'ai lu et j'accepte les")}{" "}
              {/* preventDefault: without it, a click inside the label would
                  ALSO toggle the checkbox on the way to opening the dialog. */}
              <button type="button" onClick={(e) => { e.preventDefault(); setOpen(true); }}
                className="font-semibold text-blue-600 hover:underline">
                {t("conditions générales d'utilisation")}
              </button>
              {"."}
            </span>
          </label>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          aria-label={t("Ouvrir et lire les conditions générales d'utilisation")}
          className="w-full text-left p-4 rounded-2xl border border-blue-600/40 bg-blue-600/5 hover:bg-blue-600/10 transition-colors">
          <span className="flex items-start gap-3 text-sm">
            {/* Looks like the checkbox it is about to become, so the block
                still reads as "there is a box here to tick". */}
            <span className={`mt-0.5 w-4 h-4 shrink-0 rounded border-2 border-blue-600/50 ${c.card}`} aria-hidden="true" />
            <span className={c.sub}>
              {t("J'ai lu et j'accepte les")}{" "}
              <span className="font-semibold text-blue-600 underline">{t("conditions générales d'utilisation")}</span>
              {"."}
            </span>
          </span>
          <span className={`mt-2 ml-7 block text-xs ${c.faint}`}>{t("Cliquez ici pour les ouvrir et les lire.")}</span>
        </button>
      )}
    </>
  );
}
