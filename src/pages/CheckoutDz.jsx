import { useEffect, useMemo, useRef, useState } from "react";
import {
  Receipt, Landmark, Smartphone, Copy, Check, ShieldCheck, UploadCloud,
  Send, MessageCircle, Hash, StickyNote, CheckCircle2, FileText, Zap, X, Phone,
  Gift, XCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PLANS } from "@/constants/pricing";
import { ACCENTS } from "@/components/pricing/PlanCard";
import { planDzdAmount, applyPercentOff } from "@/utils/currency";
import { getDzCheckoutPlan, getDzCheckoutPromo, setDzCheckoutPromo } from "@/utils/dzCheckout";
import { getPaymentDz } from "@/services/settingsService";
import { validatePromoCode, promoLabel } from "@/services/stripeService";
import { saleActive, salePromo } from "../../api/_lib/sale.js";
import { submitSubscriptionRequest, notifyNewRequest, MAX_RECEIPT_BYTES, ACCEPTED_RECEIPT_TYPES } from "@/services/subscriptionService";

// The two manual methods offered to Algerian users (Stripe is never used for
// DZD). Each reveals the account details to transfer to, then a receipt upload.
// BaridiMob leads and is preselected — it is the way most buyers actually pay.
const METHODS = [
  { id: "baridimob", label: "BaridiMob", icon: Smartphone },
  { id: "ccp", label: "CCP (Compte Courant Postal)", icon: Landmark },
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
  const [method, setMethod] = useState(METHODS[0].id);
  const [file, setFile] = useState(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef(null);

  // Resolve the plan the user picked on the Tarifs page. Missing/invalid (e.g.
  // someone deep-links here) → back to Tarifs.
  const plan = useMemo(() => PLANS.find((p) => p.name === getDzCheckoutPlan() && p.slug), []);
  // Seeded from the code applied on the Tarifs page, but editable here: a buyer
  // who lands on this page without one (or who is given a code after arriving)
  // must still be able to enter it, so this is state rather than a one-shot
  // read. Declared above the early return below — hooks must run in the same
  // order on every render. Every change is mirrored back to sessionStorage so
  // it survives a reload of this page.
  const [promo, setPromo] = useState(getDzCheckoutPromo);
  const [coupon, setCoupon] = useState("");
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (!plan) { nav("pricing"); return; }
    if (!user) { notify(t("Créez un compte gratuit pour vous abonner.")); nav("register"); return; }
    getPaymentDz().then(setCfg);
  }, [plan, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan || !user) return null;

  const fullAmount = cfg ? planDzdAmount(plan, cfg.prices) : planDzdAmount(plan);
  // During a sale (api/_lib/sale.js) its discount is the only one: applied
  // here whatever was stored, and the code field below is locked.
  const sale = saleActive();
  const applied = sale ? salePromo() : promo;
  // Percentage only — a fixed-amount coupon is in USD and cannot be taken off a
  // dinar total, so the Tarifs page never lets one through to here.
  const amount = applied?.percentOff ? applyPercentOff(fullAmount, applied.percentOff) : fullAmount;
  const waUrl = cfg?.whatsappGroupUrl || "";

  // Same validation the Tarifs page runs (api/public/promo-validate), with the same
  // dinar rule: a fixed-amount Stripe coupon is denominated in USD and cannot
  // honestly be subtracted from a dinar total, so only a percentage is kept.
  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setChecking(true);
    setCouponError("");
    const r = await validatePromoCode(code);
    setChecking(false);
    if (!r.valid) {
      setCouponError(r.unavailable
        ? t("Vérification indisponible ici (fonctions serverless non déployées).")
        : t("Ce code n'est pas valide, a expiré ou a atteint sa limite d'utilisation."));
      return;
    }
    if (!r.percentOff) {
      setCouponError(t("Ce code est un montant fixe en dollars : il ne peut pas s'appliquer à un paiement en dinars. Seuls les codes en pourcentage sont acceptés ici."));
      return;
    }
    const next = { code: r.code, percentOff: r.percentOff };
    setPromo(next);
    setDzCheckoutPromo(next);
    setCoupon("");
  };

  const removeCoupon = () => {
    setPromo(null);
    setDzCheckoutPromo(null);
    setCouponError("");
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!ACCEPTED_RECEIPT_TYPES.includes(f.type)) return notify(t("Format non pris en charge. Utilisez JPG, PNG, WEBP ou PDF."));
    if (f.size > MAX_RECEIPT_BYTES) return notify(t("Fichier trop volumineux (max 20 Mo)."));
    setFile(f);
  };

  const submit = async () => {
    // Phone is required so the owner can reach the buyer about their payment.
    if (phone.replace(/\D/g, "").length < 9) return notify(t("Entrez un numéro de téléphone valide pour vous joindre."));
    if (!file) return notify(t("Ajoutez d'abord une capture ou une photo de votre reçu de paiement."));
    setBusy(true);
    const r = await submitSubscriptionRequest({
      plan: plan.name, planDays: plan.days, method, amountDzd: amount,
      reference, receiptFile: file,
      // The code goes in the notes so the reviewer can see why the transfer is
      // smaller than the list price, without a schema change.
      notes: applied ? `[Code promo ${applied.code} · −${applied.percentOff} %] ${notes || ""}`.trim() : notes,
    });
    setBusy(false);
    if (!r.ok) return notify(t(r.error || "Envoi impossible. Réessayez."));
    notifyNewRequest(r.id, phone); // ping the owner on Telegram with the phone (best-effort; phone isn't stored)
    setSent(true);
    window.scrollTo({ top: 0 });
  };

  const accent = ACCENTS[plan.accent] || ACCENTS.blue;
  const phoneOk = phone.replace(/\D/g, "").length >= 9;
  // The three steps, ticked as they are done — the stepper at the top and
  // the numbered sections below follow the same order.
  const steps = [
    { n: 1, l: "Payer", done: false },
    { n: 2, l: "Envoyer le reçu", done: !!file },
    { n: 3, l: "Vos coordonnées", done: phoneOk },
  ];
  const numberBadge = (n, done) => (
    <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}>
      {done ? <Check size={14} strokeWidth={3} /> : n}
    </span>
  );
  const sectionTitle = (n, done, icon, label) => {
    const Icon = icon;
    return (
      <div className="flex items-center gap-3 mb-4">
        {numberBadge(n, done)}
        <p className={`flex items-center gap-2 font-display font-bold ${c.text}`}><Icon size={16} className={c.faint} /> {t(label)}</p>
      </div>
    );
  };

  if (sent) {
    return (
      <PageShell back eyebrow={t("Abonnement")} title={t("Demande envoyée !")} sub={t("Nous vérifions votre paiement et activons votre accès au plus vite.")}>
        <Card className="p-8 max-w-xl mx-auto text-center">
          <span className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"><CheckCircle2 size={30} /></span>
          <h3 className={`mt-4 font-display font-bold text-xl ${c.text}`}>{t("Votre demande a bien été reçue")}</h3>
          <div className={`mt-4 mx-auto max-w-sm flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${c.border}`}>
            <span className="text-sm font-bold" style={{ color: accent.solid }}>{t("Forfait")} {t(plan.name)}</span>
            <span className={`font-display font-extrabold ${c.text}`}>{amount}</span>
          </div>
          <p className={`mt-4 text-sm ${c.sub}`}>{t("Vous recevrez une confirmation dès l'activation (activation en moins de 15 minutes après vérification du reçu).")}</p>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-white shadow-lg" style={{ background: "#25D366" }}>
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
      {/* Stepper: Payer → Envoyer le reçu → Vos coordonnées. */}
      <ol className="mb-6 flex items-center gap-2 sm:gap-3 overflow-x-auto">
        {steps.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.border} ${c.card}`}>
              {numberBadge(s.n, s.done)}
              <span className={`text-sm font-semibold ${c.text}`}>{t(s.l)}</span>
            </span>
            {i < steps.length - 1 && <span className={`w-6 sm:w-10 border-t-2 border-dashed ${c.border}`} aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-5 items-start">
        {/* ── the three steps ─────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0 order-2 lg:order-1">
          <Card className="p-6">
            {sectionTitle(1, false, Landmark, "Payer")}
            <div className="grid sm:grid-cols-2 gap-3">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={active}
                    className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${active ? "border-blue-600 bg-blue-600/5 shadow-md shadow-blue-600/10" : `${c.border} ${c.card} ${c.hoverSoft}`}`}>
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-blue-600 text-white" : "bg-blue-600/10 text-blue-600"}`}><m.icon size={19} /></span>
                    <span className={`flex-1 text-sm font-semibold ${c.text}`}>{t(m.label)}</span>
                    <span className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${active ? "border-blue-600 bg-blue-600 text-white" : c.border}`}>
                      {active && <Check size={11} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The transfer details, set out like a receipt, with the amount
                copyable next to the account numbers. */}
            <div className={`mt-4 rounded-2xl border-2 border-dashed ${c.border} px-5 py-3`}>
              <p className={`text-sm pt-1 pb-1.5 ${c.sub}`}>
                {method === "ccp" ? t("Effectuez un virement vers le compte CCP suivant :") : t("Effectuez un versement BaridiMob vers le RIP suivant :")}
              </p>
              {method === "ccp" ? (
                <>
                  <DetailRow label="Numéro CCP" value={cfg?.ccp?.number} />
                  <DetailRow label="Clé" value={cfg?.ccp?.key} />
                  <DetailRow label="Titulaire" value={cfg?.ccp?.holder} />
                </>
              ) : (
                <>
                  <DetailRow label="RIP" value={cfg?.baridimob?.rip} />
                  {cfg?.baridimob?.holder && <DetailRow label="Titulaire" value={cfg.baridimob.holder} />}
                </>
              )}
              <DetailRow label="Montant à envoyer" value={amount} />
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm rounded-2xl bg-emerald-500/10 text-emerald-700 px-4 py-3">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              {t("Activation en moins de 15 minutes après réception et vérification de votre reçu.")}
            </p>
          </Card>

          <Card className="p-6">
            {sectionTitle(2, !!file, FileText, "Envoyer le reçu")}
            <p className={`text-sm -mt-2 mb-4 ${c.sub}`}>{t("Téléversez une capture d'écran ou une photo de votre reçu de paiement.")}</p>

            <input ref={fileRef} type="file" accept={ACCEPTED_RECEIPT_TYPES.join(",")} className="hidden" aria-label={t("Choisir un fichier")}
              onChange={(e) => pickFile(e.target.files?.[0])} />

            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={18} /></span>
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
                className={`w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors ${dragOver ? "border-blue-600 bg-blue-600/5" : `${c.border} ${c.hoverSoft}`}`}>
                <span className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-600 grid place-items-center"><UploadCloud size={22} /></span>
                <span className={`text-sm ${c.sub}`}>{t("Glissez votre fichier ici ou")} <span className="font-semibold text-blue-600">{t("cliquez pour choisir")}</span></span>
                <span className={`text-xs ${c.faint}`}>{t("JPG, PNG, WEBP ou PDF (max 20 Mo)")}</span>
              </button>
            )}

            {waUrl && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <span className={`flex-1 border-t ${c.border}`} /><span className={`text-xs font-semibold ${c.faint}`}>{t("OU")}</span><span className={`flex-1 border-t ${c.border}`} />
                </div>
                <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-5 py-4 text-white transition hover:brightness-105" style={{ background: "#25D366" }}>
                  <MessageCircle size={22} className="shrink-0" />
                  <span>
                    <span className="block font-bold">{t("Vous avez payé ? Envoyez le reçu ici")}</span>
                    <span className="block text-sm text-white/90 flex items-center gap-1"><Zap size={13} /> {t("Activation rapide par WhatsApp")}</span>
                  </span>
                </a>
              </>
            )}
          </Card>

          <Card className="p-6">
            {sectionTitle(3, phoneOk, Phone, "Vos coordonnées")}
            <div className="space-y-4">
              <div>
                <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}><Phone size={13} /> {t("Numéro de téléphone")} <span className="normal-case font-medium text-rose-600">({t("requis")})</span></label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" required placeholder={t("Ex. : 05 55 12 34 56")} className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
                <p className={`mt-1.5 text-xs ${c.faint}`}>{t("Pour vous joindre au sujet de votre paiement si besoin.")}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}><Hash size={13} /> {t("Référence de paiement")} <span className="normal-case font-medium">({t("optionnel")})</span></label>
                  <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("Numéro de transaction, référence CCP, etc.")} className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
                </div>
                <div>
                  <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}><StickyNote size={13} /> {t("Notes")} <span className="normal-case font-medium">({t("optionnel")})</span></label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Informations supplémentaires…")} className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`} />
                </div>
              </div>
            </div>

            <Btn className="mt-6 w-full !py-4" icon={Send} disabled={busy} onClick={submit}>
              {busy ? t("Envoi…") : `${t("Envoyer ma demande d'abonnement")} · ${amount}`}
            </Btn>
          </Card>
        </div>

        {/* ── order summary ───────────────────────────────────────────────── */}
        <Card className="overflow-hidden lg:sticky lg:top-24 order-1 lg:order-2">
          <div className="px-6 pt-5 pb-4 text-white" style={{ background: accent.grad }}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80"><Receipt size={14} /> {t("Récapitulatif")}</p>
            <p className="mt-2 font-display font-extrabold text-2xl">{t(plan.name)}</p>
            <p className="text-sm text-white/85">{plan.days} {t("jours d'accès")}</p>
          </div>
          <div className="p-6">
            {/* Everything the pass grants, run together: the tier is chosen,
                and the buyer is checking what they are about to pay for. */}
            <ul className="space-y-2">
              {[...plan.feats, ...(plan.also || [])].map((f) => (
                <li key={f} className={`flex gap-2.5 text-sm ${c.sub}`}>
                  <span className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-px" style={{ background: accent.solid + "1a" }}><Check size={12} strokeWidth={3} color={accent.solid} /></span>
                  <span>{t(f)}</span>
                </li>
              ))}
            </ul>
            {/* Code promo. The Tarifs page has the same field, but a buyer can
                reach this page without having used it — or be given a code once
                here — so the total must stay reachable from this screen too. */}
            <div className={`mt-5 pt-4 border-t ${c.border}`}>
              <p className={`font-semibold text-sm mb-3 flex items-center gap-2 ${c.text}`}><Gift size={16} className="text-rose-600" /> {t("Vous avez un code promo ?")}</p>
              {applied ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3">
                  <span className="text-sm text-emerald-600 flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span className="font-mono2 font-semibold truncate">{applied.sale ? t("Promo") : applied.code}</span>
                    <span className="shrink-0">· {promoLabel(applied)}</span>
                  </span>
                  {!sale && <button type="button" onClick={removeCoupon} className={`text-xs font-semibold shrink-0 ${c.faint} hover:text-rose-600`}>{t("Retirer")}</button>}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponError(""); }} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} placeholder={t("Ex. : BIENVENUE20")} aria-label={t("Code promo")} className={`flex-1 min-w-0 px-4 py-3 rounded-2xl border text-sm font-mono2 outline-none focus:border-blue-600 ${c.inputCls}`} />
                  <Btn small disabled={checking || !coupon.trim()} onClick={applyCoupon}>{t(checking ? "Vérification…" : "Appliquer")}</Btn>
                </div>
              )}
              {sale && <p className={`mt-2 text-xs ${c.faint}`}>{t("Promo appliquée automatiquement, non cumulable avec un autre code.")}</p>}
              {couponError && <p className="mt-3 text-sm text-rose-600 flex items-start gap-1.5"><XCircle size={15} className="shrink-0 mt-0.5" /> {couponError}</p>}
            </div>
            <div className={`mt-5 pt-4 border-t-2 border-dashed ${c.border} flex items-end justify-between gap-3`}>
              <span className={`text-sm font-semibold ${c.text}`}>{t("Total à payer")}</span>
              <span className="text-right min-w-0">
                {applied && <span className={`block text-sm line-through ${c.faint}`}>{fullAmount}</span>}
                <span className="font-display font-extrabold text-3xl" style={{ color: accent.solid }}>{amount}</span>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
