import { useEffect, useMemo, useRef, useState } from "react";
import {
  Receipt, Landmark, Smartphone, Copy, Check, ShieldCheck, UploadCloud,
  Send, MessageCircle, Hash, StickyNote, CheckCircle2, FileText, Zap, X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PLANS } from "@/constants/pricing";
import { planDzdAmount } from "@/utils/currency";
import { getDzCheckoutPlan } from "@/utils/dzCheckout";
import { getPaymentDz } from "@/services/settingsService";
import { submitSubscriptionRequest, MAX_RECEIPT_BYTES, ACCEPTED_RECEIPT_TYPES } from "@/services/subscriptionService";

// The two manual methods offered to Algerian users (Stripe is never used for
// DZD). Each reveals the account details to transfer to, then a receipt upload.
const METHODS = [
  { id: "ccp", label: "CCP (Compte Courant Postal)", icon: Landmark },
  { id: "baridimob", label: "BaridiMob", icon: Smartphone },
];

// One "label : value [copy]" line for an account detail.
function DetailRow({ label, value }) {
  const { c, t, notify } = useApp();
  const [copied, setCopied] = useState(false);
  const filled = !!value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { notify(t("Copie impossible — sélectionnez le numéro manuellement.")); }
  };
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 border-b last:border-0 ${c.border}`}>
      <span className={`text-sm ${c.sub}`}>{t(label)}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-mono2 font-semibold truncate ${filled ? c.text : c.faint}`}>{filled ? value : t("à configurer")}</span>
        {filled && (
          <button type="button" onClick={copy} aria-label={t("Copier")} className={`p-1.5 rounded-lg shrink-0 ${c.hoverSoft} ${copied ? "text-emerald-600" : "text-blue-600"}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </span>
    </div>
  );
}

export function CheckoutDz() {
  const { c, t, user, nav, notify } = useApp();
  const [cfg, setCfg] = useState(null);
  const [method, setMethod] = useState("ccp");
  const [file, setFile] = useState(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef(null);

  // Resolve the plan the user picked on the Tarifs page. Missing/invalid (e.g.
  // someone deep-links here) → back to Tarifs.
  const plan = useMemo(() => PLANS.find((p) => p.name === getDzCheckoutPlan() && p.priceId), []);

  useEffect(() => {
    if (!plan) { nav("pricing"); return; }
    if (!user) { notify(t("Créez un compte gratuit pour vous abonner.")); nav("register"); return; }
    getPaymentDz().then(setCfg);
  }, [plan, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan || !user) return null;

  const amount = cfg ? planDzdAmount(plan, cfg.prices) : planDzdAmount(plan);
  const waUrl = cfg?.whatsappGroupUrl || "";

  const pickFile = (f) => {
    if (!f) return;
    if (!ACCEPTED_RECEIPT_TYPES.includes(f.type)) return notify(t("Format non pris en charge. Utilisez JPG, PNG, WEBP ou PDF."));
    if (f.size > MAX_RECEIPT_BYTES) return notify(t("Fichier trop volumineux (max 20 Mo)."));
    setFile(f);
  };

  const submit = async () => {
    if (!file) return notify(t("Ajoutez d'abord une capture ou une photo de votre reçu de paiement."));
    setBusy(true);
    const r = await submitSubscriptionRequest({
      plan: plan.name, planDays: plan.days, method, amountDzd: amount,
      reference, notes, receiptFile: file,
    });
    setBusy(false);
    if (!r.ok) return notify(t(r.error || "Envoi impossible. Réessayez."));
    setSent(true);
    window.scrollTo({ top: 0 });
  };

  if (sent) {
    return (
      <PageShell back eyebrow={t("Abonnement")} title={t("Demande envoyée !")} sub={t("Nous vérifions votre paiement et activons votre accès au plus vite.")}>
        <Card className="p-8 max-w-xl mx-auto text-center">
          <span className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 size={30} /></span>
          <h3 className={`mt-4 font-display font-bold text-xl ${c.text}`}>{t("Votre demande a bien été reçue")}</h3>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("Forfait")} <strong className={c.text}>{t(plan.name)}</strong> · {amount}. {t("Vous recevrez une confirmation dès l'activation (activation en moins de 15 minutes après vérification du reçu).")}</p>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-white shadow-lg" style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
              <MessageCircle size={18} /> {t("Envoyer aussi le reçu sur WhatsApp")}
            </a>
          )}
          <div className="mt-6">
            <Btn variant="ghost" small onClick={() => nav("dashboard")}>{t("Aller au tableau de bord")}</Btn>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell back wide eyebrow={t("Paiement en dinar algérien")} title={t("Finaliser votre abonnement")} sub={t("Payez par CCP ou BaridiMob, puis téléversez votre reçu. Votre accès est activé après vérification.")}>
      <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-5 items-start">
        {/* ── Récapitulatif ─────────────────────────────────────────────── */}
        <Card className="p-6 lg:sticky lg:top-24">
          <p className={`flex items-center gap-2 text-sm font-bold ${c.text}`}><Receipt size={16} className="text-blue-600" /> {t("Récapitulatif")}</p>
          <div className="mt-4 rounded-2xl grad-brand text-white px-5 py-4 text-center shadow-lg">
            <p className="font-display font-extrabold text-lg">{t(plan.name)}</p>
            <p className="text-sm text-white/85">{plan.days} {t("jours d'accès")}</p>
          </div>
          <ul className="mt-5 space-y-2.5">
            {plan.feats.map((f) => (
              <li key={f} className={`flex gap-2 text-sm ${c.sub}`}><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /><span>{t(f)}</span></li>
            ))}
          </ul>
          <div className={`mt-5 pt-4 border-t ${c.border} flex items-center justify-between`}>
            <span className={`text-sm font-semibold ${c.text}`}>{t("Total à payer")}</span>
            <span className="font-display font-extrabold text-2xl grad-text">{amount}</span>
          </div>
        </Card>

        {/* ── Paiement ──────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          <Card className="p-6">
            <p className={`flex items-center gap-2 text-sm font-bold mb-4 ${c.text}`}><Landmark size={16} className="text-blue-600" /> {t("Mode de paiement")}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={active}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-colors ${active ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`}`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-blue-600 text-white" : "bg-blue-600/10 text-blue-600"}`}><m.icon size={18} /></span>
                    <span className={`text-sm font-semibold ${c.text}`}>{t(m.label)}</span>
                  </button>
                );
              })}
            </div>

            {/* Account details for the chosen method */}
            <div className={`mt-4 rounded-2xl border ${c.border} p-5`}>
              {method === "ccp" ? (
                <>
                  <p className={`text-sm mb-1 ${c.sub}`}>{t("Effectuez un virement vers le compte CCP suivant :")}</p>
                  <DetailRow label="Numéro CCP" value={cfg?.ccp?.number} />
                  <DetailRow label="Clé" value={cfg?.ccp?.key} />
                  <DetailRow label="Titulaire" value={cfg?.ccp?.holder} />
                </>
              ) : (
                <>
                  <p className={`text-sm mb-1 ${c.sub}`}>{t("Effectuez un versement BaridiMob vers le RIP suivant :")}</p>
                  <DetailRow label="RIP" value={cfg?.baridimob?.rip} />
                  {cfg?.baridimob?.holder && <DetailRow label="Titulaire" value={cfg.baridimob.holder} />}
                </>
              )}
            </div>
            <p className={`mt-3 flex items-start gap-2 text-sm rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3`}>
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              {t("Activation en moins de 15 minutes après réception et vérification de votre reçu.")}
            </p>
          </Card>

          {/* Proof of payment */}
          <Card className="p-6">
            <p className={`flex items-center gap-2 text-sm font-bold ${c.text}`}><FileText size={16} className="text-blue-600" /> {t("Justificatif de paiement")}</p>
            <p className={`text-sm mt-1 mb-4 ${c.sub}`}>{t("Téléversez une capture d'écran ou une photo de votre reçu de paiement.")}</p>

            <input ref={fileRef} type="file" accept={ACCEPTED_RECEIPT_TYPES.join(",")} className="hidden" aria-label={t("Choisir un fichier")}
              onChange={(e) => pickFile(e.target.files?.[0])} />

            {file ? (
              <div className={`flex items-center gap-3 rounded-2xl border ${c.border} p-4`}>
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Check size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${c.text}`}>{file.name}</p>
                  <p className={`text-xs ${c.faint}`}>{(file.size / 1e6).toFixed(1)} Mo</p>
                </div>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label={t("Retirer le fichier")} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600 shrink-0`}><X size={16} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`}`}>
                <UploadCloud size={28} className={c.faint} />
                <span className={`text-sm ${c.sub}`}>{t("Glissez votre fichier ici ou")} <span className="font-semibold text-blue-600">{t("cliquez pour choisir")}</span></span>
                <span className={`text-xs ${c.faint}`}>{t("JPG, PNG, WEBP ou PDF (max 20 Mo)")}</span>
              </button>
            )}

            {waUrl && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <span className={`flex-1 h-px ${c.border} border-t`} /><span className={`text-xs font-semibold ${c.faint}`}>{t("OU")}</span><span className={`flex-1 h-px ${c.border} border-t`} />
                </div>
                <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-5 py-4 text-white shadow-lg" style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
                  <MessageCircle size={22} className="shrink-0" />
                  <span>
                    <span className="block font-bold">{t("Vous avez payé ? Envoyez le reçu ici")}</span>
                    <span className="block text-sm text-white/85 flex items-center gap-1"><Zap size={13} /> {t("Activation rapide par WhatsApp")}</span>
                  </span>
                </a>
              </>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}><Hash size={13} /> {t("Référence de paiement")} <span className="normal-case font-medium">({t("optionnel")})</span></label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("Numéro de transaction, référence CCP, etc.")} className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
              </div>
              <div>
                <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}><StickyNote size={13} /> {t("Notes")} <span className="normal-case font-medium">({t("optionnel")})</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t("Informations supplémentaires…")} className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
              </div>
            </div>

            <Btn className="mt-6 w-full" icon={Send} disabled={busy} onClick={submit}>
              {busy ? t("Envoi…") : t("Envoyer ma demande d'abonnement")}
            </Btn>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
