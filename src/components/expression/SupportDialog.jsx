import { useEffect, useRef, useState } from "react";
import { X, Mail, Copy, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Card } from "@/components/common";
import { CONTACT_EMAIL } from "@/constants/social";

// "Problème technique — besoin d'assistance": the candidate writes to the
// team by email (owner's choice, 2026-10-23 — it replaced the WhatsApp
// call-back form). Opened as a dialog over the workshop rather than a page of
// its own, so their text or recording stays on screen behind it.
//
// Nothing is collected here: the button opens the candidate's own mail app,
// addressed to the site's public contact address, with the subject and the
// technical context (`context`: what they were shown, section, tâche, page,
// browser) already written in, so the team never has to ask "what happened,
// on what phone?". "Copier l'adresse" covers devices with no mail app set up.

export const SUPPORT_SUBJECT = "Problème technique — besoin d'assistance";

const SECTION_NAMES = { eo: "Expression orale", ee: "Expression écrite", co: "Compréhension orale", ce: "Compréhension écrite" };

// The email the candidate's mail app opens with. Exported for tests.
export function supportMailto(context = {}, extra = {}) {
  const lines = [
    "Bonjour,",
    "",
    "Décrivez ici ce qui se passe :",
    "",
    "",
    "",
    "---",
    "Informations techniques (laissez-les, elles nous aident à régler le problème) :",
    context.issue && `Message affiché : ${context.issue}`,
    context.section && `Épreuve : ${SECTION_NAMES[context.section] || context.section}${context.task ? `, tâche ${context.task}` : ""}`,
    extra.page && `Page : ${extra.page}`,
    extra.online === false && "Connexion : hors ligne",
    extra.userAgent && `Navigateur : ${extra.userAgent}`,
  ].filter((l) => l !== false && l !== undefined && l !== null && l !== 0);
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function SupportDialog({ context = {}, onClose }) {
  const { c, t } = useApp();
  const [copied, setCopied] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const href = supportMailto(context, {
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard refused: the address is on screen to copy by hand */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <Card className="w-full max-w-lg p-6 rise relative max-h-[92dvh] overflow-y-auto text-left">
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("Fermer")} className={`absolute top-4 right-4 p-1.5 rounded-lg ${c.sub} ${c.hoverSoft}`}>
          <X size={18} />
        </button>

        <h2 id="support-title" className={`font-display font-bold text-xl pr-8 flex items-center gap-2 ${c.text}`}>
          <Mail size={20} className="text-blue-600 shrink-0" aria-hidden="true" />
          {t("Besoin d'aide ? Écrivez-nous")}
        </h2>
        <p className={`mt-2 text-sm ${c.sub}`}>{t("Envoyez-nous un e-mail : un membre de l'équipe vous répond pour régler le problème avec vous. Le bouton ci-dessous prépare le message, avec les informations techniques déjà jointes.")}</p>

        <p className={`mt-4 text-xs font-semibold uppercase tracking-wide ${c.faint}`}>{t("Objet")}</p>
        <p className={`text-sm font-semibold ${c.text}`}>{t(SUPPORT_SUBJECT)}</p>

        <p className={`mt-4 text-xs font-semibold uppercase tracking-wide ${c.faint}`}>{t("Adresse")}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold font-mono2 ${c.text}`}>{CONTACT_EMAIL}</span>
          <button type="button" onClick={copy} className={`px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${c.border} ${c.sub} ${c.hoverSoft}`}>
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />} {copied ? t("Copiée") : t("Copier l'adresse")}
          </button>
        </div>

        <div className="mt-6">
          <Btn icon={Mail} onClick={() => { window.location.href = href; }}>{t("Écrire un e-mail")}</Btn>
        </div>
        <p className={`text-xs mt-3 ${c.faint}`}>{t("Si rien ne s'ouvre, copiez l'adresse et écrivez-nous depuis votre messagerie habituelle.")}</p>
      </Card>
    </div>
  );
}

// The link under every problem card. Owns the dialog's open state, so a card
// only has to say what the problem was (`context`).
export function SupportLink({ context }) {
  const { c, t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className={`text-sm mt-3 ${c.sub}`}>
        {t("Toujours bloqué·e ?")}{" "}
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-blue-600 hover:underline text-left">
          {t("Écrivez-nous par e-mail")}
        </button>
      </p>
      {open && <SupportDialog context={context} onClose={() => setOpen(false)} />}
    </>
  );
}
