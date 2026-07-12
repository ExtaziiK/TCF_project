import { useState } from "react";
import { CheckCircle2, ArrowRight, ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { EXAM_MODES, COUNTRIES } from "@/constants/exam";

// Shown once the candidate asks to start a TCF blanc: pick a mode (test vs
// entraînement) and enter the identity shown on the exam screen. Defaults the
// name/email from the signed-in account so it's usually one click away.
export function ExamSetup({ onStart, onCancel, busy }) {
  const { c, user, notify, t } = useApp();
  const [mode, setMode] = useState("test");
  const [nom, setNom] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [pays, setPays] = useState("");

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const submit = () => {
    if (!nom.trim()) return notify(t("Entrez votre nom pour continuer."));
    if (!pays) return notify(t("Sélectionnez votre pays pour continuer."));
    onStart({ mode, nom: nom.trim(), email: email.trim(), pays });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancel} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-6"><ChevronLeft size={15} /> {t("Retour")}</button>

      <Card className="p-6 md:p-8">
        <div className="text-center mb-7">
          <h3 className={`font-display font-bold text-xl ${c.text}`}>{t("Choisissez votre mode")}</h3>
          <p className={`text-sm mt-1 ${c.sub}`}>{t("Sélectionnez le mode qui correspond à vos besoins.")}</p>
        </div>

        {/* Mode cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {EXAM_MODES.map((m) => {
            const active = m.id === mode;
            const accent = m.badgeTone === "red";
            return (
              <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={active}
                className={`text-left p-5 rounded-3xl border-2 transition-all relative
                ${active ? (accent ? "border-rose-500 bg-rose-500/5" : "border-amber-500 bg-amber-500/5") : `${c.border} ${c.hoverSoft}`}`}>
                <span className="absolute top-4 right-4"><Pill tone={m.badgeTone}>{t(m.badge)}</Pill></span>
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}><m.icon size={20} /></span>
                <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t(m.name)}</p>
                <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${c.faint}`}>{t(m.tagline)}</p>
                <ul className="mt-4 space-y-2">
                  {m.feats.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${c.sub}`}><CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{t(f)}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Candidate info */}
        <div className={`border-t ${c.border} mt-7 pt-6`}>
          <p className={`text-sm ${c.sub} mb-4`}>{t("Renseignez vos informations pour recevoir votre score par e-mail à la fin du test.")}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ex-nom" className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}>{t("Nom")}</label>
              <input id="ex-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t("Votre nom")} className={inp} />
            </div>
            <div>
              <label htmlFor="ex-email" className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}>{t("E-mail")}</label>
              <input id="ex-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("vous@exemple.com")} className={inp} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="ex-pays" className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}>{t("Pays")}</label>
            <select id="ex-pays" value={pays} onChange={(e) => setPays(e.target.value)} className={inp}>
              <option value="">{t("Sélectionnez votre pays")}</option>
              {COUNTRIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <Btn variant="accent" className="w-full mt-6" icon={ArrowRight} disabled={busy} onClick={submit}>{t(busy ? "Génération…" : "Commencer le test")}</Btn>
        <p className={`text-xs text-center mt-3 ${c.faint}`}>{t("Le chronomètre démarre dès la première question. Score calculé automatiquement.")}</p>
      </Card>
    </div>
  );
}
