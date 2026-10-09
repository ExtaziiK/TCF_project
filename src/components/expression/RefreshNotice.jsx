import { useState } from "react";
import { RefreshCw, Copy, Check, Download } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { failureIssue } from "@/utils/aiIssue";

// What a candidate sees when an analysis could not be completed — in place of
// a technical error. One instruction (refresh the page), and first, a way to
// keep their work: refreshing empties the page, and losing a written text or
// a recording is what turns a failed call into a frustrated candidate.
//
// `copyText` — their text (Expression écrite) or the conversation so far
// (tâche 2 interview); `downloadUrl` — their recording (tâches 1 and 3).
// The failure itself is recorded for the admin elsewhere (the endpoint, or
// reportClientIssue in aiService).
//
// `kind` (utils/aiIssue.js → failureKind): "offline" and "timeout" have a
// cause the candidate can act on, so they are named with what to do. Anything
// else ("generic": a Groq refusal, a bug of ours) is never explained — only
// "refresh the page".
//
// The analysis was given back server-side before this appears, so the line
// "cette tentative ne vous a rien coûté" is true for every case shown here.

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Android WebViews (the Facebook in-app browser among them) have no
    // async clipboard: fall back to a selected textarea.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function RefreshNotice({ copyText, copyLabel = "Copier mon texte", downloadUrl, downloadName = "mon-enregistrement.webm", compact = false, kind = "generic", section = "ee" }) {
  const { c, t, notify } = useApp();
  const [copied, setCopied] = useState(false);
  const issue = failureIssue(kind, section);
  const hasWork = !!(copyText && copyText.trim()) || !!downloadUrl;

  const copy = async () => {
    const ok = await copyToClipboard(copyText);
    if (ok) setCopied(true);
    else notify(t("La copie automatique n'est pas disponible sur ce navigateur : sélectionnez votre texte et copiez-le à la main."), "error");
  };

  return (
    <div role="alert" className={`rounded-2xl border-2 border-blue-600/40 ${compact ? "p-3.5" : "p-5"}`}>
      <p className={`font-semibold flex items-center gap-2 ${compact ? "text-sm" : ""} ${c.text}`}>
        <RefreshCw size={compact ? 15 : 17} className="text-blue-600 shrink-0" aria-hidden="true" />
        {t(issue ? issue.title : "Cette page doit être actualisée pour continuer.")}
      </p>
      {issue?.cause && <p className="text-sm font-semibold mt-2 text-blue-700 dark:text-blue-400">{t(issue.cause)}</p>}
      {issue && (
        <ol className={`text-sm mt-2 space-y-1 list-decimal pl-5 ${c.sub}`}>
          {issue.steps.map((step) => <li key={step}>{t(step)}</li>)}
        </ol>
      )}
      <p className={`text-sm mt-1.5 ${c.sub}`}>
        {hasWork
          ? t("Gardez d'abord votre travail : la page sera vide après l'actualisation. Cette tentative ne vous a rien coûté.")
          : t("Actualisez la page, puis relancez. Cette tentative ne vous a rien coûté.")}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        {copyText && copyText.trim() && (
          <Btn small variant={copied ? "ghost" : "primary"} icon={copied ? Check : Copy} onClick={copy}>
            {t(copied ? "Copié" : copyLabel)}
          </Btn>
        )}
        {downloadUrl && (
          <a href={downloadUrl} download={downloadName} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Download size={15} aria-hidden="true" /> {t("Télécharger mon enregistrement")}
          </a>
        )}
        <Btn small variant="ghost" icon={RefreshCw} onClick={() => window.location.reload()}>{t("Actualiser la page")}</Btn>
      </div>
    </div>
  );
}
