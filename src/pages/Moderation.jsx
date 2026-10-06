import { useEffect, useState } from "react";
import { Inbox, Check, ExternalLink, FileText, Crown, CloudOff, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { listModerationQueue, moderationReceiptUrl, approveSubscriptionRequest } from "@/services/adminService";

// The moderator's page: the DZD payment requests (CCP / BaridiMob), and one
// action — approve. A moderator has no other back-office access; refusing or
// deleting a request stays with the owner in Administration → Demandes. Every
// rule here is re-checked server-side (api/_lib/admin/moderation.js), which is
// also what decides the plan and duration granted: this page only sends an id.

const FILTERS = [["new", "À traiter"], ["approved", "Approuvées"], ["all", "Toutes"]];
const TONES = { new: "amber", approved: "green" };
const LABELS = { new: "À traiter", approved: "Approuvée" };
const METHOD_LABELS = { ccp: "CCP", baridimob: "BaridiMob" };
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export function Moderation() {
  const { c, notify } = useApp();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("new");
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    const r = await listModerationQueue();
    if (!r.ok) {
      setError(r.unavailable ? "Indisponible en local (fonctions serverless absentes)." : r.error || "Chargement impossible.");
      setRequests([]);
      return;
    }
    setError(null);
    setRequests(r.data.requests || []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (req) => {
    setBusyId(req.id);
    const r = await approveSubscriptionRequest(req.id);
    setBusyId(null);
    notify(r.ok ? `${req.plan} activé pour ${req.email || "le client"}.` : r.error || "Activation refusée.");
    load();
  };
  const openReceipt = async (req) => {
    // Opened before the await so the browser does not treat it as a pop-up.
    const tab = window.open("", "_blank");
    const r = await moderationReceiptUrl(req.id);
    if (r.ok && r.data.url) {
      if (tab) tab.location.href = r.data.url;
      else window.open(r.data.url, "_blank", "noopener");
    } else {
      tab?.close();
      notify(r.error || "Reçu indisponible.");
    }
  };

  const list = (requests || []).filter((r) => filter === "all" || r.status === filter);

  return (
    <PageShell back eyebrow="Modération" title="Demandes de paiement" sub="Vérifiez le reçu, puis approuvez pour activer l'abonnement du client.">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap items-center">
          {FILTERS.map(([id, l]) => (
            <button key={id} onClick={() => { setConfirmId(null); setFilter(id); }} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {l}{id !== "all" && requests ? ` · ${requests.filter((r) => r.status === id).length}` : ""}
            </button>
          ))}
          <button onClick={() => { setRequests(null); load(); }} aria-label="Actualiser" title="Actualiser" className={`ml-auto p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><RefreshCw size={16} /></button>
        </div>

        {error && (
          <Card className="p-4 flex items-center gap-3 border-amber-500/40">
            <CloudOff size={18} className="text-amber-500 shrink-0" />
            <p className={`text-sm ${c.sub}`}>{error}</p>
          </Card>
        )}

        <Card className="p-4 sm:p-6">
          {requests === null ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} aria-hidden="true" className={`h-28 animate-pulse rounded-2xl ${c.track}`} />)}</div>
          ) : list.length === 0 ? (
            <div className="py-10 text-center">
              <span className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-600/10 text-blue-600"><Inbox size={20} /></span>
              <p className={`mt-3 font-display font-bold text-sm ${c.text}`}>{filter === "new" ? "Aucune demande à traiter." : "Aucune demande dans cette catégorie."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => (
                <div key={r.id} className={`p-4 rounded-2xl border ${r.status === "new" ? "border-amber-500/40 bg-amber-500/5" : c.border}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Pill tone={TONES[r.status]}>{LABELS[r.status]}</Pill>
                    <Pill tone="blue"><Crown size={11} /> {r.plan}</Pill>
                    <span className={`text-sm font-bold ${c.text}`}>{r.amount_dzd || "—"}</span>
                    <span className={`text-xs ${c.faint}`}>{METHOD_LABELS[r.method] || r.method} · {when(r.created_at)}</span>
                  </div>
                  <p className={`text-sm break-words ${c.text}`}>{r.name || "—"} <span className={c.faint}>· {r.email || "—"}</span></p>
                  {r.reference && <p className={`text-xs mt-1 ${c.sub}`}>Réf. : <span className="font-mono2">{r.reference}</span></p>}
                  {r.notes && <p className={`text-sm mt-1 whitespace-pre-wrap ${c.sub}`}>{r.notes}</p>}
                  {r.status === "approved" && r.approved_at && <p className={`text-xs mt-1 ${c.faint}`}>Approuvée le {when(r.approved_at)}</p>}
                  {!r.has_account && <p className="text-xs mt-1 text-amber-600">Compte supprimé — activation impossible.</p>}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {confirmId === r.id ? (
                      <>
                        <span className={`text-sm font-semibold ${c.text}`}>Approuver et activer cet abonnement ?</span>
                        <Btn small variant="accent" icon={Check} disabled={busyId === r.id} onClick={() => { setConfirmId(null); approve(r); }}>Confirmer</Btn>
                        <Btn small variant="ghost" onClick={() => setConfirmId(null)}>Annuler</Btn>
                      </>
                    ) : (
                      <>
                        {r.has_receipt
                          ? <Btn small variant="ghost" icon={ExternalLink} onClick={() => openReceipt(r)}>Voir le reçu</Btn>
                          : <span className={`text-xs px-2 py-1 rounded-lg ${c.hoverSoft} ${c.faint} flex items-center gap-1`}><FileText size={13} /> Reçu via WhatsApp</span>}
                        {r.status === "new" && (
                          <Btn small variant="ghost" className="text-emerald-600" icon={Check} disabled={busyId === r.id || !r.has_account} onClick={() => setConfirmId(r.id)}>
                            {busyId === r.id ? "Activation…" : "Approuver & activer"}
                          </Btn>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
