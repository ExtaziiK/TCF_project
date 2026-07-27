import { useEffect, useState } from "react";
import {
  Landmark, Smartphone, MessageCircle, Save, CloudOff, Inbox, Check, XCircle,
  Trash2, FileText, ExternalLink, Crown, RotateCcw, Coins,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { PLANS } from "@/constants/pricing";
import { planDzdAmount } from "@/utils/currency";
import { getPaymentDz, setPaymentDz } from "@/services/settingsService";
import { updateAdminUser } from "@/services/adminService";
import {
  listSubscriptionRequests, signReceiptUrl, setRequestStatus, deleteSubscriptionRequest,
} from "@/services/subscriptionService";

const PAID_PLANS = PLANS.filter((p) => p.priceId);
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function Skeleton({ className = "" }) {
  const { c } = useApp();
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl ${c.track} ${className}`} />;
}
function Unavailable({ children }) {
  const { c } = useApp();
  return (
    <Card className="p-4 mb-2 flex items-center gap-3 border-amber-500/40">
      <CloudOff size={18} className="text-amber-500 shrink-0" />
      <p className={`text-sm ${c.sub}`}>{children}</p>
    </Card>
  );
}

/* --------------------------------- Tarifs --------------------------------- */

// The "Tarifs" admin section. Sub-tabbed so more payment regions/methods can be
// added later; for now it holds the "DZD" (Algeria) settings.
export function TarifsTab() {
  const { c } = useApp();
  const [sub, setSub] = useState("dzd");
  const subs = [["dzd", "DZD"]];
  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {subs.map(([id, l]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${sub === id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>{l}</button>
        ))}
      </div>
      {sub === "dzd" && <PaymentSettingsTab />}
    </div>
  );
}

// Owner-editable DZD payment config: the CCP / BaridiMob account details shown
// on the manual checkout, the WhatsApp group link, and a per-plan DZD price
// (blank → the auto-converted amount is used). Persisted to site_settings.
export function PaymentSettingsTab() {
  const { c, notify } = useApp();
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;

  useEffect(() => { getPaymentDz().then(setCfg); }, []);

  // Paths are at most two levels ("ccp.number", "prices.Passeport", or a top-
  // level key like "whatsappGroupUrl").
  const setIn = (path, v) => setCfg((p) => {
    const [a, b] = path.split(".");
    return b === undefined ? { ...p, [a]: v } : { ...p, [a]: { ...p[a], [b]: v } };
  });

  const save = async () => {
    setBusy(true);
    const r = await setPaymentDz(cfg);
    setBusy(false);
    notify(r.ok ? "Détails de paiement enregistrés." : (r.error || "Enregistrement refusé. Vérifiez que la migration payment_dz est appliquée."));
  };

  if (!cfg) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}><Landmark size={17} className="text-blue-600" /> Compte CCP</h3>
        <p className={`text-sm mb-5 ${c.sub}`}>Affiché aux clients qui paient en dinar algérien par virement CCP.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className={label}>Numéro CCP</label><input value={cfg.ccp.number} onChange={(e) => setIn("ccp.number", e.target.value)} placeholder="0012345678" className={`font-mono2 ${inp}`} /></div>
          <div><label className={label}>Clé</label><input value={cfg.ccp.key} onChange={(e) => setIn("ccp.key", e.target.value)} placeholder="12" className={`font-mono2 ${inp}`} /></div>
          <div><label className={label}>Titulaire</label><input value={cfg.ccp.holder} onChange={(e) => setIn("ccp.holder", e.target.value)} placeholder="Nom Prénom" className={inp} /></div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}><Smartphone size={17} className="text-blue-600" /> BaridiMob</h3>
        <p className={`text-sm mb-5 ${c.sub}`}>Le RIP vers lequel les clients effectuent un versement BaridiMob.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={label}>RIP</label><input value={cfg.baridimob.rip} onChange={(e) => setIn("baridimob.rip", e.target.value)} placeholder="007999990123456789" className={`font-mono2 ${inp}`} /></div>
          <div><label className={label}>Titulaire <span className="normal-case font-medium">(optionnel)</span></label><input value={cfg.baridimob.holder} onChange={(e) => setIn("baridimob.holder", e.target.value)} placeholder="Nom Prénom" className={inp} /></div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}><MessageCircle size={17} className="text-blue-600" /> Groupe WhatsApp</h3>
        <p className={`text-sm mb-5 ${c.sub}`}>Lien d'invitation du groupe WhatsApp où les clients envoient leur reçu (bouton « Envoyer le reçu » sur la page de paiement).</p>
        <input value={cfg.whatsappGroupUrl} onChange={(e) => setIn("whatsappGroupUrl", e.target.value)} placeholder="https://chat.whatsapp.com/…" className={inp} />
      </Card>

      <Card className="p-6">
        <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}><Coins size={17} className="text-blue-600" /> Prix en dinar (DZD)</h3>
        <p className={`text-sm mb-5 ${c.sub}`}>Le prix affiché en DZD pour chaque forfait. Laissez vide pour utiliser le montant converti automatiquement (indiqué en gris).</p>
        <div className="space-y-3">
          {PAID_PLANS.map((p) => (
            <div key={p.name} className="flex items-center gap-3 flex-wrap">
              <span className={`text-sm font-semibold w-40 shrink-0 ${c.text}`}>{p.name}</span>
              <div className="relative flex-1 min-w-[160px]">
                <input value={cfg.prices[p.name] || ""} onChange={(e) => setIn(`prices.${p.name}`, e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={planDzdAmount(p).replace(" DA", "")} className={`font-mono2 pr-12 ${inp}`} inputMode="numeric" />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${c.faint}`}>DA</span>
              </div>
              <span className={`text-xs ${c.faint}`}>≈ {planDzdAmount(p)} (auto)</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn icon={Save} disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</Btn>
      </div>
    </div>
  );
}

/* ----------------------- Demandes (subscription inbox) -------------------- */

const REQ_FILTERS = [["new", "À traiter"], ["approved", "Approuvées"], ["rejected", "Refusées"], ["all", "Toutes"]];
const REQ_TONES = { new: "amber", approved: "green", rejected: "slate" };
const REQ_LABELS = { new: "À traiter", approved: "Approuvée", rejected: "Refusée" };
const METHOD_LABELS = { ccp: "CCP", baridimob: "BaridiMob" };

export function SubscriptionRequestsTab({ onCount }) {
  const { c, notify } = useApp();
  const [requests, setRequests] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("new");
  const [busyId, setBusyId] = useState(null);

  const load = () => listSubscriptionRequests().then((r) => {
    setRequests(r.requests);
    setUnavailable(!r.ok);
    onCount?.((r.requests || []).filter((x) => x.status === "new").length);
  });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (req) => {
    setBusyId(req.id);
    // Grant the plan through the same admin endpoint the Users tab uses.
    const g = await updateAdminUser({ action: "set-plan", userId: req.user_id, plan: "Premium", days: req.plan_days, label: req.plan });
    if (!g.ok) { setBusyId(null); return notify(g.error || (g.unavailable ? "Activation indisponible en local (fonctions serverless absentes)." : "Activation refusée.")); }
    await setRequestStatus(req.id, "approved");
    setBusyId(null);
    notify(`${req.plan} activé pour ${req.email || "le client"}.`);
    load();
  };
  const reject = async (req) => {
    setBusyId(req.id);
    const r = await setRequestStatus(req.id, "rejected");
    setBusyId(null);
    notify(r.ok ? "Demande refusée." : "Action refusée.");
    load();
  };
  const remove = async (req) => {
    setBusyId(req.id);
    const r = await deleteSubscriptionRequest(req.id, req.receipt_path);
    setBusyId(null);
    notify(r.ok ? "Demande supprimée." : "Suppression refusée.");
    load();
  };
  const openReceipt = async (req) => {
    const url = await signReceiptUrl(req.receipt_path);
    if (url) window.open(url, "_blank", "noopener");
    else notify("Reçu indisponible.");
  };

  if (unavailable) {
    return <Unavailable>La boîte de réception des demandes nécessite la table <span className="font-mono2">subscription_requests</span> — appliquez la migration <span className="font-mono2">20260725_dz_payments.sql</span>.</Unavailable>;
  }

  const list = (requests || []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {REQ_FILTERS.map(([id, l]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {l}{id !== "all" && requests ? ` · ${requests.filter((r) => r.status === id).length}` : ""}
          </button>
        ))}
      </div>
      <Card className="p-6">
        {requests === null ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : list.length === 0 ? (
          <div className="py-10 text-center">
            <span className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-600/10 text-blue-600"><Inbox size={20} /></span>
            <p className={`mt-3 font-display font-bold text-sm ${c.text}`}>{filter === "new" ? "Aucune demande à traiter." : "Aucune demande dans cette catégorie."}</p>
            <p className={`mt-1 text-sm ${c.faint}`}>Les demandes de paiement en dinar (CCP / BaridiMob) apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <div key={r.id} className={`p-4 rounded-2xl border ${r.status === "new" ? "border-amber-500/40 bg-amber-500/5" : c.border}`}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Pill tone={REQ_TONES[r.status]}>{REQ_LABELS[r.status]}</Pill>
                  <Pill tone="blue"><Crown size={11} /> {r.plan}</Pill>
                  <span className={`text-sm font-bold ${c.text}`}>{r.amount_dzd || "—"}</span>
                  <span className={`text-xs ${c.faint}`}>{METHOD_LABELS[r.method] || r.method} · {when(r.created_at)}</span>
                </div>
                <p className={`text-sm ${c.text}`}>{r.name || "—"} <span className={c.faint}>· {r.email || "compte supprimé"}</span></p>
                {r.reference && <p className={`text-xs mt-1 ${c.sub}`}>Réf. : <span className="font-mono2">{r.reference}</span></p>}
                {r.notes && <p className={`text-sm mt-1 whitespace-pre-wrap ${c.sub}`}>{r.notes}</p>}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {r.receipt_path
                    ? <Btn small variant="ghost" icon={ExternalLink} onClick={() => openReceipt(r)}>Voir le reçu</Btn>
                    : <span className={`text-xs px-2 py-1 rounded-lg ${c.hoverSoft} ${c.faint} flex items-center gap-1`}><FileText size={13} /> Reçu via WhatsApp</span>}
                  {r.status !== "approved" && <Btn small variant="ghost" className="text-emerald-600" icon={Check} disabled={busyId === r.id || !r.user_id} onClick={() => approve(r)}>Approuver &amp; activer</Btn>}
                  {r.status !== "rejected" && <Btn small variant="ghost" className="text-amber-600" icon={XCircle} disabled={busyId === r.id} onClick={() => reject(r)}>Refuser</Btn>}
                  {r.status === "rejected" && <Btn small variant="ghost" icon={RotateCcw} disabled={busyId === r.id} onClick={() => setRequestStatus(r.id, "new").then(load)}>Remettre en file</Btn>}
                  <Btn small variant="ghost" className="text-rose-600" icon={Trash2} disabled={busyId === r.id} onClick={() => remove(r)}>Supprimer</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
