import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Receipt, TrendingUp, CalendarDays, Plus, Save, Trash2, Download,
  CloudOff, Check, X, Coins, HandCoins,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { MoneyBars } from "@/components/dashboard/charts";
import { PLANS } from "@/constants/pricing";
import { formatDzdTotal } from "@/utils/currency";
import {
  listRevenue, setRequestAmount, addRevenueEntry, deleteRevenueEntry, MANUAL_METHODS,
} from "@/services/revenueService";

// Chiffre d'affaires in dinars. Reads the ledger assembled by revenueService —
// approved DZD requests plus payments recorded by hand — and answers the only
// questions the owner actually asks of it: how much came in today, over the
// chosen window, from which pass, by which channel.
//
// Everything is aggregated client-side from one fetch. That is not laziness:
// the whole ledger is at most a few hundred rows for a long while, and doing it
// here keeps every figure consistent with the list underneath it and lets the
// period switch feel instant.

const PAID_PLANS = PLANS.filter((p) => p.slug);
const METHOD_LABELS = { ccp: "CCP", baridimob: "BaridiMob", cash: "Espèces", other: "Autre" };

const PERIODS = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "month", label: "Ce mois" },
  { id: "year", label: "Cette année" },
  { id: "all", label: "Tout" },
];

const pad = (n) => String(n).padStart(2, "0");
// Local-time bucket keys. Deliberately not toISOString(): that is UTC, and in
// Algeria (UTC+1) a sale approved at 00:30 would land on the previous day.
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

// The window a period chip covers, and whether its chart counts by day or by
// month. `from` null means "everything ever".
function rangeFor(id) {
  const now = new Date();
  const today = startOfDay(now);
  const daysAgo = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  switch (id) {
    case "today": return { from: today, mode: "day" };
    case "7d": return { from: daysAgo(6), mode: "day" };
    case "30d": return { from: daysAgo(29), mode: "day" };
    case "month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), mode: "day" };
    case "year": return { from: new Date(now.getFullYear(), 0, 1), mode: "month" };
    default: return { from: null, mode: "month" };
  }
}

// One bar per day (or per month) across the window, including the empty ones —
// a gap in the takings is information, so it gets a slot rather than being
// squeezed out.
function buildBars(sales, from, mode) {
  const now = new Date();
  const totals = new Map();
  const keyOf = mode === "day" ? dayKey : monthKey;
  for (const s of sales) {
    const k = keyOf(new Date(s.date));
    totals.set(k, (totals.get(k) || 0) + (s.amount || 0));
  }

  const bars = [];
  if (mode === "day") {
    const cursor = new Date(from);
    while (cursor <= now && bars.length < 62) {
      const k = dayKey(cursor);
      bars.push({ key: k, label: k.slice(8), title: k, value: totals.get(k) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    // "Tout" starts at the first sale rather than at some arbitrary origin, so
    // an empty ledger doesn't render a wall of zeroes.
    const earliest = sales.length ? new Date(Math.min(...sales.map((s) => +new Date(s.date)))) : now;
    const start = from || earliest;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end && bars.length < 36) {
      const k = monthKey(cursor);
      bars.push({ key: k, label: cursor.toLocaleDateString("fr-CA", { month: "short" }).replace(".", ""), title: k, value: totals.get(k) || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return bars;
}

// Totals per plan / per method, biggest first.
function groupBy(sales, field, fallback) {
  const m = new Map();
  for (const s of sales) {
    const k = s[field] || fallback;
    const cur = m.get(k) || { label: k, total: 0, count: 0 };
    cur.total += s.amount || 0;
    cur.count += 1;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

function Skeleton({ className = "" }) {
  const { c } = useApp();
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl ${c.track} ${className}`} />;
}

function StatCard({ icon: Icon, value, label, hint }) {
  const { c } = useApp();
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display font-extrabold text-2xl grad-text break-all">{value}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-600/10 text-blue-600"><Icon size={16} /></span>
      </div>
      <p className={`text-sm font-medium mt-1 ${c.text}`}>{label}</p>
      {hint && <p className={`text-xs mt-1 ${c.faint}`}>{hint}</p>}
    </Card>
  );
}

// Horizontal share bars for the plan / method splits. Same single-hue idiom as
// the dashboard's SectionBars, but the magnitude is money, so the figure shown
// is the amount and the bar is a share of the biggest line.
function ShareBars({ rows, empty }) {
  const { c } = useApp();
  if (rows.length === 0) return <p className={`text-sm py-4 text-center ${c.faint}`}>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between items-baseline gap-3 text-xs mb-1">
            <span className={`font-medium truncate ${c.sub}`}>{r.label} <span className={c.faint}>· {r.count}</span></span>
            <span className={`font-mono2 font-semibold shrink-0 ${c.text}`}>{formatDzdTotal(r.total)}</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${c.track}`}>
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------- record an off-inbox payment -------------------- */

// A payment that never went through the DZD checkout: cash handed over, a
// transfer settled on WhatsApp, a pass granted straight from Utilisateurs.
function AddPaymentForm({ onDone, onCancel }) {
  const { c, notify } = useApp();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayKey(new Date()));
  const [plan, setPlan] = useState(PAID_PLANS[0]?.name || "");
  const [method, setMethod] = useState("cash");
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;

  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return notify("Entrez un montant en dinars.");
    setBusy(true);
    // Noon local, so the entry cannot slide into the neighbouring day when the
    // date is read back in another timezone.
    const r = await addRevenueEntry({
      occurredAt: new Date(`${date}T12:00:00`).toISOString(),
      amount: n, plan, method, customer, email, notes,
    });
    setBusy(false);
    if (!r.ok) return notify(r.error || "Enregistrement refusé. Vérifiez que la migration 20260807_revenue est appliquée.");
    notify(`Paiement de ${formatDzdTotal(n)} enregistré.`);
    onDone();
  };

  return (
    <Card className="p-6">
      <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}><HandCoins size={17} className="text-blue-600" /> Enregistrer un paiement</h3>
      <p className={`text-sm mb-5 ${c.sub}`}>Pour un encaissement hors de la boîte « Demandes » : espèces, virement réglé sur WhatsApp, accès accordé à la main. Les demandes approuvées sont déjà comptées automatiquement.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Montant reçu</label>
          <div className="relative">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="700" className={`font-mono2 pr-12 ${inp}`} />
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${c.faint}`}>DA</span>
          </div>
        </div>
        <div><label className={label}>Date d'encaissement</label><input type="date" value={date} max={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} className={inp} /></div>
        <div>
          <label className={label}>Forfait</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inp}>
            {PAID_PLANS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div>
          <label className={label}>Méthode</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inp}>
            {MANUAL_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div><label className={label}>Client <span className="normal-case font-medium">(optionnel)</span></label><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nom Prénom" className={inp} /></div>
        <div><label className={label}>Email <span className="normal-case font-medium">(optionnel)</span></label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" className={inp} /></div>
        <div className="sm:col-span-2"><label className={label}>Note <span className="normal-case font-medium">(optionnel)</span></label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Référence, contexte…" className={inp} /></div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Btn small variant="ghost" icon={X} onClick={onCancel}>Annuler</Btn>
        <Btn small icon={Save} disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</Btn>
      </div>
    </Card>
  );
}

/* ------------------------------- ledger rows ------------------------------ */

// One sale. The amount of a request-sourced row stays editable here because the
// figure taken at checkout is what was ASKED — a buyer who transferred 700 DA
// against a 1 080 DA pass has to be recordable without touching the database.
function SaleRow({ sale, onSaved, onDeleted }) {
  const { c, notify } = useApp();
  const [draft, setDraft] = useState(null); // non-null while editing the amount
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const n = draft.trim() === "" ? null : Number(draft);
    if (draft.trim() !== "" && (!Number.isFinite(n) || n < 0)) return notify("Montant invalide.");
    setBusy(true);
    const r = await setRequestAmount(sale.id, n);
    setBusy(false);
    if (!r.ok) return notify(r.error || "Correction refusée. Vérifiez que la migration 20260807_revenue est appliquée.");
    setDraft(null);
    notify("Montant corrigé.");
    onSaved();
  };

  const remove = async () => {
    setBusy(true);
    const r = await deleteRevenueEntry(sale.id);
    setBusy(false);
    if (!r.ok) return notify(r.error || "Suppression refusée.");
    notify("Paiement supprimé.");
    onDeleted();
  };

  return (
    <div className={`p-4 rounded-2xl border ${c.border}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={sale.source === "manual" ? "amber" : "green"}>{sale.source === "manual" ? "Saisi" : "Demande"}</Pill>
            {sale.plan && <Pill tone="blue">{sale.plan}</Pill>}
            <span className={`text-xs ${c.faint}`}>{METHOD_LABELS[sale.method] || sale.method || "—"} · {when(sale.date)}</span>
          </div>
          <p className={`text-sm mt-1.5 ${c.text}`}>{sale.customer || "—"} <span className={c.faint}>· {sale.email || "compte supprimé"}</span></p>
          {sale.notes && <p className={`text-xs mt-1 whitespace-pre-wrap ${c.sub}`}>{sale.notes}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {draft !== null ? (
            <>
              <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setDraft(null); }}
                aria-label="Montant reçu en dinars"
                className={`w-28 px-3 py-2 rounded-xl border text-sm font-mono2 outline-none focus:border-blue-600 ${c.inputCls}`} />
              <button onClick={save} disabled={busy} className={`p-2 rounded-xl ${c.hoverSoft} text-emerald-600`} aria-label="Enregistrer le montant"><Check size={16} /></button>
              <button onClick={() => setDraft(null)} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`} aria-label="Annuler"><X size={16} /></button>
            </>
          ) : (
            <>
              <div className="text-right">
                <p className={`font-display font-bold ${sale.amount == null ? c.faint : c.text}`}>{sale.amount == null ? "montant inconnu" : formatDzdTotal(sale.amount)}</p>
                {sale.inferred && <p className={`text-[11px] ${c.faint}`}>auto · d'après le checkout</p>}
              </div>
              {sale.source === "request" && (
                <button onClick={() => setDraft(sale.amount == null ? "" : String(sale.amount))} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`} aria-label="Corriger le montant" title="Corriger le montant reçu"><Coins size={15} /></button>
              )}
              {sale.source === "manual" && (
                confirmDel ? (
                  <>
                    <button onClick={remove} disabled={busy} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`} aria-label="Confirmer la suppression"><Check size={16} /></button>
                    <button onClick={() => setConfirmDel(false)} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`} aria-label="Annuler"><X size={16} /></button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDel(true)} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`} aria-label="Supprimer ce paiement"><Trash2 size={15} /></button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- tab ---------------------------------- */

export function RevenueTab() {
  const { c, notify } = useApp();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [adding, setAdding] = useState(false);

  const load = () => listRevenue().then(setData);
  useEffect(() => { load(); }, []);

  const sales = data?.sales || [];
  const { from, mode } = rangeFor(period);

  const view = useMemo(() => {
    const scoped = from ? sales.filter((s) => new Date(s.date) >= from) : sales;
    const sum = (list) => list.reduce((t, s) => t + (s.amount || 0), 0);
    const today = startOfDay(new Date());
    return {
      scoped,
      total: sum(scoped),
      allTime: sum(sales),
      today: sum(sales.filter((s) => new Date(s.date) >= today)),
      bars: buildBars(scoped, from, mode),
      byPlan: groupBy(scoped, "plan", "Sans forfait"),
      byMethod: groupBy(scoped, "method", "—").map((r) => ({ ...r, label: METHOD_LABELS[r.label] || r.label })),
    };
  }, [sales, period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same rows the list shows, for a spreadsheet. Amounts stay raw numbers —
  // "1 080 DA" is unusable in a sum.
  const exportCsv = () => {
    if (view.scoped.length === 0) return notify("Rien à exporter sur cette période.");
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Source", "Client", "Email", "Forfait", "Methode", "Montant DZD", "Notes"],
      ...view.scoped.map((s) => [
        new Date(s.date).toISOString(), s.source === "manual" ? "saisi" : "demande",
        s.customer, s.email, s.plan, METHOD_LABELS[s.method] || s.method, s.amount ?? "", s.notes,
      ]),
    ].map((r) => r.map(cell).join(";")).join("\r\n");
    // BOM so Excel opens the accented headers as UTF-8.
    const url = URL.createObjectURL(new Blob([`\uFEFF${rows}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenus-${period}-${dayKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  const periodLabel = PERIODS.find((p) => p.id === period)?.label || "";

  return (
    <div className="space-y-4">
      {data.requestsUnavailable && (
        <Card className="p-4 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>Les demandes d'abonnement sont illisibles — appliquez la migration <span className="font-mono2">20260725_dz_payments.sql</span>.</p>
        </Card>
      )}
      {data.entriesUnavailable && (
        <Card className="p-4 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>Les paiements saisis à la main ne sont pas disponibles — appliquez la migration <span className="font-mono2">20260807_revenue.sql</span>. Les demandes approuvées restent comptées.</p>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${period === p.id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {p.label}
          </button>
        ))}
        <span className="flex-1" />
        <Btn small variant="ghost" icon={Download} onClick={exportCsv}>Exporter</Btn>
        {!adding && <Btn small icon={Plus} onClick={() => setAdding(true)}>Paiement</Btn>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} value={formatDzdTotal(view.total)} label={`Recettes · ${periodLabel.toLowerCase()}`} hint={`${view.scoped.length} vente${view.scoped.length > 1 ? "s" : ""}`} />
        <StatCard icon={CalendarDays} value={formatDzdTotal(view.today)} label="Aujourd'hui" hint="Encaissé depuis minuit" />
        <StatCard icon={Receipt} value={formatDzdTotal(view.scoped.length ? view.total / view.scoped.length : 0)} label="Panier moyen" hint="Sur la période choisie" />
        <StatCard icon={TrendingUp} value={formatDzdTotal(view.allTime)} label="Total cumulé" hint={`${sales.length} vente${sales.length > 1 ? "s" : ""} depuis le début`} />
      </div>

      {adding && <AddPaymentForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}

      <Card className="p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <h3 className={`font-display font-bold ${c.text}`}>Recettes {mode === "day" ? "par jour" : "par mois"}</h3>
          <span className={`text-xs ${c.faint}`}>{periodLabel} · survolez une barre pour le détail</span>
        </div>
        {view.bars.length === 0
          ? <p className={`text-sm py-6 text-center ${c.faint}`}>Aucune vente enregistrée pour l'instant.</p>
          : <MoneyBars bars={view.bars} label={`Recettes ${mode === "day" ? "par jour" : "par mois"} en dinars`} format={formatDzdTotal} />}
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Par forfait</h3>
          <ShareBars rows={view.byPlan} empty="Aucune vente sur cette période." />
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Par méthode de paiement</h3>
          <ShareBars rows={view.byMethod} empty="Aucune vente sur cette période." />
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <h3 className={`font-display font-bold ${c.text}`}>Détail des ventes</h3>
          <span className={`text-xs ${c.faint}`}>{view.scoped.length} ligne{view.scoped.length > 1 ? "s" : ""} · {formatDzdTotal(view.total)}</span>
        </div>
        {view.scoped.length === 0 ? (
          <div className="py-10 text-center">
            <span className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-600/10 text-blue-600"><Wallet size={20} /></span>
            <p className={`mt-3 font-display font-bold text-sm ${c.text}`}>Aucune recette sur cette période.</p>
            <p className={`mt-1 text-sm ${c.faint}`}>Chaque demande approuvée dans « Demandes » apparaît ici automatiquement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {view.scoped.map((s) => <SaleRow key={s.key} sale={s} onSaved={load} onDeleted={load} />)}
          </div>
        )}
      </Card>
    </div>
  );
}
