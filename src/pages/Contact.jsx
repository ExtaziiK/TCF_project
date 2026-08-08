import { useState } from "react";
import { CheckCircle2, ArrowRight, Mail, XCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn, SOCIAL_ICON } from "@/components/common";
import { submitContactMessage } from "@/services/adminService";
import { SOCIAL, CONTACT_EMAIL, socialHref } from "@/constants/social";
import { recordSocialClick } from "@/services/socialClicksService";

// `network` is what marks a row as click-counted; the email row has none, so it
// stays untracked — a mailto: is not a channel visit and would only muddy the
// figures it sat next to.
const channels = [
  { label: "Courriel", d: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, icon: Mail, tone: "text-blue-600 bg-blue-600/10" },
  ...SOCIAL.map((s) => ({ label: s.label, d: s.handle, sub: s.d, href: socialHref(s), icon: SOCIAL_ICON[s.key], tone: s.tone, external: true, network: s.key })),
];

export function Contact() {
  const { c, user, notify, t } = useApp();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", subject: "", message: "" });
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  // Writes to the contact_messages table (RLS: anyone may insert, only admins
  // read); the message lands in the admin dashboard's inbox.
  const send = async () => {
    if (!form.name.trim() || !form.message.trim()) return setError(t("Indiquez au moins votre nom et votre message."));
    if (!/.+@.+\..+/.test(form.email)) return setError(t("Entrez une adresse courriel valide."));
    setBusy(true);
    const { ok } = await submitContactMessage({ ...form, userId: user?.id });
    setBusy(false);
    if (!ok) return setError(t("L'envoi a échoué. Réessayez dans un instant."));
    setSent(true);
    notify(t("Message envoyé !"));
  };

  return (
    <PageShell back eyebrow={t("Contact")} title={t("Une question ? Écrivez-nous")} sub={t("Notre équipe répond en moins de 24 h ouvrables, en français ou en anglais.")}>
      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-3 p-7">
          {sent ? (
            <div className="text-center py-10 rise">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t("Message envoyé")}</p>
              <p className={`mt-1 text-sm ${c.sub}`}>{t("Merci ! Vous recevrez une réponse à votre courriel sous 24 h.")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input value={form.name} onChange={set("name")} placeholder={t("Votre nom")} aria-label={t("Nom")} className={inp} />
                <input value={form.email} onChange={set("email")} placeholder={t("Votre courriel")} aria-label={t("Courriel")} type="email" className={inp} />
              </div>
              <input value={form.subject} onChange={set("subject")} placeholder={t("Sujet")} aria-label={t("Sujet")} className={inp} />
              <textarea value={form.message} onChange={set("message")} placeholder={t("Votre message…")} aria-label={t("Message")} rows={5} maxLength={4000} className={inp} />
              {error && <p className="text-sm text-rose-600 flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5" />{error}</p>}
              <Btn icon={ArrowRight} disabled={busy} onClick={send}>{t(busy ? "Envoi…" : "Envoyer le message")}</Btn>
            </div>
          )}
        </Card>
        <div className="md:col-span-2 space-y-4">
          {/* A support channel is a promise: a live-chat window and a weekly
              study group were advertised here before they existed, so a channel
              only appears once it is real and staffed. The email plus the
              community channels below all are — they come from
              constants/social.js, the same list the footer renders.
              `handle`/address stays out of t(): there is nothing to translate. */}
          {channels.map((k) => (
            <Card key={k.label} className="p-5 flex items-center gap-4">
              <span className={`w-11 h-11 rounded-2xl ${k.tone} flex items-center justify-center shrink-0`}><k.icon size={19} /></span>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${c.text}`}>{t(k.label)}</p>
                <a href={k.href} {...(k.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={k.network ? () => recordSocialClick(k.network, "contact") : undefined}
                  className="text-sm font-medium text-blue-600 hover:underline break-all">{k.d}</a>
                {k.sub && <p className={`text-xs mt-0.5 ${c.sub}`}>{t(k.sub)}</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
