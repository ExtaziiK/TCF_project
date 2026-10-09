import { useEffect, useRef, useState } from "react";
import { X, Send, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Card } from "@/components/common";
import { postJSON } from "@/services/aiService";
import { normalizeWhatsApp } from "../../../api/_lib/phone.js";

// "Problème technique — besoin d'assistance": the candidate asks to be called
// back on WhatsApp (api/_lib/public/support.js). Opened as a dialog over the
// workshop rather than a page of its own, so their text or recording stays on
// screen behind it — leaving the page to ask for help would lose the very work
// they need help with.
//
// The WhatsApp number is required: a call back is the point. The technical
// context (`context`: what they were shown, section, tâche) travels with the
// request, so the team never has to ask "what happened, on what phone?".

export const SUPPORT_SUBJECT = "Problème technique — besoin d'assistance";

export function SupportDialog({ context = {}, onClose }) {
  const { c, t, user } = useApp();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: "", message: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const closeRef = useRef(null);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async () => {
    if (!form.name.trim()) return setError(t("Indiquez votre nom."));
    if (!/.+@.+\..+/.test(form.email)) return setError(t("Entrez une adresse courriel valide."));
    if (!normalizeWhatsApp(form.phone, user?.country || "").ok) {
      return setError(t("Entrez un numéro WhatsApp valide, avec l'indicatif du pays (par exemple +213 5XX XX XX XX)."));
    }
    setBusy(true);
    try {
      const r = await postJSON("/api/public/support", {
        ...form,
        context: {
          ...context,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
          online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        },
      });
      setSentTo(r.whatsapp || form.phone);
    } catch (err) {
      setError(err?.serverReplied && err.message ? err.message : t("L'envoi a échoué. Vérifiez votre connexion, puis réessayez."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <Card className="w-full max-w-lg p-6 rise relative max-h-[92dvh] overflow-y-auto text-left">
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("Fermer")} className={`absolute top-4 right-4 p-1.5 rounded-lg ${c.sub} ${c.hoverSoft}`}>
          <X size={18} />
        </button>

        {sentTo ? (
          <div className="text-center py-6">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
            <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t("Demande envoyée")}</p>
            <p className={`mt-2 text-sm ${c.sub}`}>{t("Notre équipe vous recontacte sur WhatsApp au")} <strong className={c.text}>{sentTo}</strong> {t("dès que possible.")}</p>
            <Btn small variant="ghost" className="mt-5" onClick={onClose}>{t("Fermer")}</Btn>
          </div>
        ) : (
          <>
            <h2 id="support-title" className={`font-display font-bold text-xl pr-8 flex items-center gap-2 ${c.text}`}>
              <MessageCircle size={20} className="text-emerald-500 shrink-0" aria-hidden="true" />
              {t("Besoin d'aide ? On vous rappelle")}
            </h2>
            <p className={`mt-2 text-sm ${c.sub}`}>{t("Laissez votre numéro WhatsApp : un membre de l'équipe vous appelle pour régler le problème avec vous. Les informations techniques sont jointes automatiquement.")}</p>

            <p className={`mt-4 text-xs font-semibold uppercase tracking-wide ${c.faint}`}>{t("Objet")}</p>
            <p className={`text-sm font-semibold ${c.text}`}>{t(SUPPORT_SUBJECT)}</p>

            <div className="space-y-3 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.name} onChange={set("name")} placeholder={t("Votre nom")} aria-label={t("Nom")} className={inp} />
                <input value={form.email} onChange={set("email")} placeholder={t("Votre courriel")} aria-label={t("Courriel")} type="email" className={inp} />
              </div>
              <div>
                <label htmlFor="support-phone" className={`text-sm font-semibold ${c.text}`}>
                  {t("Numéro WhatsApp")} <span className="text-rose-600">*</span>
                </label>
                <input id="support-phone" value={form.phone} onChange={set("phone")} placeholder="+213 5XX XX XX XX" type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" className={`${inp} mt-1.5`} />
                <p className={`text-xs mt-1 ${c.faint}`}>{t("Avec l'indicatif du pays de préférence. Utilisé uniquement pour vous rappeler.")}</p>
              </div>
              <textarea value={form.message} onChange={set("message")} placeholder={t("Décrivez ce qui se passe (facultatif)")} aria-label={t("Message")} rows={3} maxLength={2500} className={inp} />
              {error && <p className="text-sm text-rose-600 flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5" />{error}</p>}
              <Btn icon={Send} disabled={busy} onClick={send}>{t(busy ? "Envoi…" : "Demander à être rappelé·e")}</Btn>
            </div>
          </>
        )}
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
          {t("Contactez-nous, on vous rappelle sur WhatsApp")}
        </button>
      </p>
      {open && <SupportDialog context={context} onClose={() => setOpen(false)} />}
    </>
  );
}
