import { MicOff, RefreshCw, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { micIssue, isInAppBrowser } from "@/utils/aiIssue";

// A microphone problem, named, with what to do about it (utils/aiIssue.js →
// micIssue). Shown above the oral workshops instead of a short toast that
// disappears before it can be followed.
//
// `code`: the browser's error name (NotAllowedError, NotReadableError…), or
// "unsupported" / "silent". A permission or a busy microphone only clears on a
// reload, so those offer "Actualiser la page"; a silent recording can simply
// be tried again, so it offers to close the card instead.
export function MicHelp({ code, onClose }) {
  const { c, t } = useApp();
  if (!code) return null;
  const issue = micIssue(code, { inApp: isInAppBrowser() });
  const retryInPlace = code === "silent";

  return (
    <div role="alert" className="rounded-2xl border-2 border-amber-500/50 p-5 mb-5 text-left">
      <div className="flex items-start justify-between gap-3">
        <p className={`font-semibold flex items-center gap-2 ${c.text}`}>
          <MicOff size={17} className="text-amber-600 shrink-0" aria-hidden="true" />
          {t(issue.title)}
        </p>
        {onClose && (
          <button onClick={onClose} aria-label={t("Fermer")} className={`shrink-0 ${c.faint} hover:opacity-70`}><X size={17} /></button>
        )}
      </div>
      <ol className={`text-sm mt-2 space-y-1 list-decimal pl-5 ${c.sub}`}>
        {issue.steps.map((step) => <li key={step}>{t(step)}</li>)}
      </ol>
      {!retryInPlace && (
        <Btn small variant="ghost" icon={RefreshCw} className="mt-3" onClick={() => window.location.reload()}>{t("Actualiser la page")}</Btn>
      )}
    </div>
  );
}
