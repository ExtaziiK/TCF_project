import { useState } from "react";
import { CheckCircle2, ArrowRight, Mail, MessageCircle, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";

export function Contact() {
  const { c, notify } = useApp();
  const [sent, setSent] = useState(false);
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  return (
    <PageShell eyebrow="Contact" title="Une question ? Écrivez-nous" sub="Notre équipe répond en moins de 24 h ouvrables, en français ou en anglais.">
      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-3 p-7">
          {sent ? (
            <div className="text-center py-10 rise">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>Message envoyé</p>
              <p className={`mt-1 text-sm ${c.sub}`}>Merci ! Vous recevrez une réponse à votre courriel sous 24 h.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Votre nom" aria-label="Nom" className={inp} />
                <input placeholder="Votre courriel" aria-label="Courriel" type="email" className={inp} />
              </div>
              <input placeholder="Sujet" aria-label="Sujet" className={inp} />
              <textarea placeholder="Votre message…" aria-label="Message" rows={5} className={inp} />
              <Btn icon={ArrowRight} onClick={() => { setSent(true); notify("Message envoyé (démo)."); }}>Envoyer le message</Btn>
            </div>
          )}
        </Card>
        <div className="md:col-span-2 space-y-4">
          {[{ icon: Mail, t: "Courriel", d: "bonjour@passerelle.ca" }, { icon: MessageCircle, t: "Clavardage en direct", d: "Lun.–ven., 9 h à 17 h (HE)" }, { icon: Users, t: "Communauté", d: "Groupe d'étude hebdomadaire en ligne" }].map((k) => (
            <Card key={k.t} className="p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><k.icon size={19} /></span>
              <div><p className={`font-semibold text-sm ${c.text}`}>{k.t}</p><p className={`text-sm ${c.sub}`}>{k.d}</p></div>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
