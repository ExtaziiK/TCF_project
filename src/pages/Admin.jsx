import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Users, FileText, Upload, MessageCircle, ScrollText,
  TrendingUp, Trash2, Check, XCircle, Shield, Headphones, Search, Crown, UserCog,
  ChevronLeft, ChevronRight, Mail, Archive, RotateCcw, CloudOff, ExternalLink, Settings2, Gauge,
  Ticket, Plus, Inbox, ListChecks, Trophy, BarChart3,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar } from "@/components/common";
import { IMPORT_SAMPLE } from "@/constants/listeningImport";
import { normalizeImportedQuestions } from "@/utils/questionImport";
import { QuestionManager } from "@/components/admin/QuestionManager";
import { DayBars } from "@/components/dashboard/charts";
import {
  fetchAdminStats, fetchAdminUsage, listAdminUsers, updateAdminUser,
  listContactMessages, setMessageStatus, deleteMessage, listAuditLog,
  listPromoCodes, createPromoCode, togglePromoCode,
} from "@/services/adminService";
import { promoLabel } from "@/services/stripeService";

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Shown when a data source needs either the serverless routes (absent under
// plain `vite`) or a migration that hasn't been applied yet.
function UnavailableCard({ children }) {
  const { c } = useApp();
  return (
    <Card className="p-4 mb-6 flex items-center gap-3 border-amber-500/40">
      <CloudOff size={18} className="text-amber-500 shrink-0" />
      <p className={`text-sm ${c.sub}`}>{children}</p>
    </Card>
  );
}

// Animated placeholder while a tab's data loads — same rounded geometry as
// the content it replaces, so the layout doesn't jump when data lands.
function Skeleton({ className = "" }) {
  const { c } = useApp();
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl ${c.track} ${className}`} />;
}

function SkeletonRows({ n = 6, className = "h-12" }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={className} />)}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  const { c } = useApp();
  return (
    <div className="py-10 text-center">
      <span className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-600/10 text-blue-600"><Icon size={20} /></span>
      <p className={`mt-3 font-display font-bold text-sm ${c.text}`}>{title}</p>
      {sub && <p className={`mt-1 text-sm ${c.faint}`}>{sub}</p>}
    </div>
  );
}

/* --------------------------------- overview ------------------------------- */

function StatCard({ icon: Icon, value, label, hint }) {
  const { c } = useApp();
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display font-extrabold text-3xl grad-text">{value}</p>
        {Icon && <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>}
      </div>
      <p className={`text-sm font-medium mt-1 ${c.text}`}>{label}</p>
      {hint && <p className="text-xs mt-1 text-emerald-500 font-medium flex items-center gap-1"><TrendingUp size={12} />{hint}</p>}
    </Card>
  );
}

function OverviewTab({ go }) {
  const { c } = useApp();
  const [stats, setStats] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    fetchAdminStats().then((r) => {
      if (r.ok) { setStats(r.data); setState("ready"); }
      else setState(r.unavailable ? "unavailable" : "error");
    });
  }, []);

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5"><Skeleton className="h-9 w-20" /><Skeleton className="h-4 w-36 mt-3" /></Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6"><Skeleton className="h-5 w-56 mb-4" /><Skeleton className="h-24" /></Card>
          <Card className="p-6"><Skeleton className="h-5 w-56 mb-4" /><Skeleton className="h-24" /></Card>
        </div>
      </div>
    );
  }
  if (state === "unavailable") {
    return <UnavailableCard>Les statistiques passent par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>. Déployez sur Vercel ou lancez <span className="font-mono2">vercel dev</span>.</UnavailableCard>;
  }
  if (state === "error") return <UnavailableCard>Impossible de charger les statistiques. Vérifiez que la migration <span className="font-mono2">20260715_admin.sql</span> est appliquée et réessayez.</UnavailableCard>;

  const u = stats.users;
  const a = stats.activity;
  const conversion = u.total ? Math.round((u.premium / u.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} value={u.total} label="Utilisateurs inscrits" hint={u.new7d > 0 ? `+${u.new7d} ces 7 derniers jours` : null} />
        <StatCard icon={Crown} value={u.premium} label="Abonnés Premium actifs" hint={`${conversion} % des comptes`} />
        <StatCard icon={ListChecks} value={a.quizzesTotal} label="Quiz complétés" hint={a.quizzes7d > 0 ? `+${a.quizzes7d} ces 7 derniers jours` : null} />
        <StatCard icon={Trophy} value={a.examsCompleted} label="TCF blancs terminés" hint={a.examsTotal > a.examsCompleted ? `${a.examsTotal - a.examsCompleted} en cours` : null} />
        <StatCard icon={BarChart3} value={a.questionAttempts} label="Réponses enregistrées" />
        <StatCard icon={Inbox} value={stats.messagesNew} label="Messages à traiter" />
      </div>
      <Card className="p-4 flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${c.faint}`}>Actions rapides</span>
        <Btn small variant="ghost" icon={Inbox} onClick={() => go("messages")}>Boîte de réception{stats.messagesNew > 0 ? ` (${stats.messagesNew})` : ""}</Btn>
        <Btn small variant="ghost" icon={Ticket} onClick={() => go("promos")}>Créer un code promo</Btn>
        <Btn small variant="ghost" icon={FileText} onClick={() => go("questions")}>Gérer les questions</Btn>
        <Btn small variant="ghost" icon={Users} onClick={() => go("users")}>Gérer les comptes</Btn>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Inscriptions — 14 derniers jours</h3>
          <DayBars days={u.signupsByDay} label="Inscriptions par jour sur 14 jours" />
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Quiz complétés — 14 derniers jours</h3>
          <DayBars days={a.quizzesByDay} label="Quiz complétés par jour sur 14 jours" />
        </Card>
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h3 className={`font-display font-bold ${c.text}`}>Répartition des forfaits</h3>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
            Facturation & remboursements sur Stripe <ExternalLink size={12} />
          </a>
        </div>
        {[["Premium (actif)", u.premium, "blue"], ["Découverte", u.free, "slate"], ["Administrateurs", u.admins, "red"]].map(([label, n, tone]) => (
          <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-2xl ${c.hoverSoft}`}>
            <Pill tone={tone}>{label}</Pill>
            <span className={`text-sm font-mono2 font-semibold ${c.text}`}>{n}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------------- users --------------------------------- */

function UsersTab() {
  const { c, user: me, notify } = useApp();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [openId, setOpenId] = useState(null); // user id whose action panel is expanded
  const [confirmId, setConfirmId] = useState(null); // pending delete confirmation
  const [busy, setBusy] = useState(false);

  const load = () => {
    setState("loading");
    listAdminUsers({ search, page }).then((r) => {
      if (r.ok) { setData(r.data); setState("ready"); }
      else setState(r.unavailable ? "unavailable" : "error");
    });
  };
  useEffect(load, [search, page]);

  // Live search, debounced so a keystroke burst issues one request.
  useEffect(() => {
    const id = setTimeout(() => { setPage(1); setSearch(query.trim()); }, 350);
    return () => clearTimeout(id);
  }, [query]);

  const act = async (payload, done) => {
    setBusy(true);
    const r = await updateAdminUser(payload);
    setBusy(false);
    if (!r.ok) return notify(r.error || "Action refusée.");
    notify(done);
    setOpenId(null);
    setConfirmId(null);
    load();
  };

  if (state === "unavailable") {
    return <UnavailableCard>La gestion des comptes passe par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>.</UnavailableCard>;
  }
  if (state === "error") return <UnavailableCard>Impossible de charger les comptes. Réessayez.</UnavailableCard>;

  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const planButton = (u, label, months) => (
    <Btn small variant="ghost" disabled={busy} icon={Crown} onClick={() => act({ action: "set-plan", userId: u.id, plan: "Premium", months }, `Premium accordé à ${u.email}.`)}>{label}</Btn>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3">
        <Search size={16} className={c.faint} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par courriel, nom ou nom d'utilisateur…"
          aria-label="Rechercher un utilisateur"
          className={`flex-1 bg-transparent text-sm outline-none ${c.text}`}
        />
        {data && <span className={`text-xs font-mono2 shrink-0 ${c.faint}`}>{data.total} compte{data.total > 1 ? "s" : ""}</span>}
        {query && (
          <button onClick={() => setQuery("")} aria-label="Effacer la recherche" className={`p-1.5 rounded-full ${c.hoverSoft} ${c.faint}`}><XCircle size={15} /></button>
        )}
      </Card>

      <Card className="p-6 overflow-x-auto">
        {state === "loading" || !data ? (
          <SkeletonRows n={6} className="h-14" />
        ) : data.users.length === 0 ? (
          <EmptyState icon={Users} title="Aucun compte ne correspond" sub="Essayez un autre courriel, nom ou nom d'utilisateur." />
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}>
                <th className="pb-3 pr-4 font-semibold">Utilisateur</th>
                <th className="pb-3 pr-4 font-semibold">Forfait</th>
                <th className="pb-3 pr-4 font-semibold">Rôle</th>
                <th className="pb-3 pr-4 font-semibold">Inscrit le</th>
                <th className="pb-3 pr-4 font-semibold">Dernière connexion</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  isSelf={u.id === me?.id}
                  open={openId === u.id}
                  confirming={confirmId === u.id}
                  busy={busy}
                  onToggle={() => { setOpenId(openId === u.id ? null : u.id); setConfirmId(null); }}
                  onConfirmDelete={() => setConfirmId(u.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  act={act}
                  planButton={planButton}
                />
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > data.perPage && (
          <div className="flex items-center justify-between mt-5">
            <Btn small variant="ghost" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Btn>
            <span className={`text-xs font-mono2 ${c.faint}`}>Page {page} / {pages} · {data.total} compte{data.total > 1 ? "s" : ""}</span>
            <Btn small variant="ghost" icon={ChevronRight} disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

function UserRow({ u, isSelf, open, confirming, busy, onToggle, onConfirmDelete, onCancelDelete, act, planButton }) {
  const { c } = useApp();
  return (
    <>
      <tr className={`border-t transition-colors ${c.border} ${open ? "" : c.hoverSoft}`}>
        <td className="py-3.5 pr-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
              {(u.name || u.username || u.email || "?").trim()[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className={`font-medium truncate ${c.text}`}>{u.name || u.username || "—"}{isSelf && <span className="ml-2 text-[10px] font-bold text-blue-600">VOUS</span>}</p>
              <p className={`text-xs truncate ${c.faint}`}>{u.email}{u.username ? ` · @${u.username}` : ""}</p>
            </div>
          </div>
        </td>
        <td className="py-3.5 pr-4">
          <Pill tone={u.premiumActive ? "blue" : "slate"}>{u.premiumActive ? "Premium" : "Découverte"}</Pill>
          {u.premiumActive && <p className={`text-[11px] mt-1 ${c.faint}`}>{u.premiumUntil ? `jusqu'au ${dateOnly(u.premiumUntil)}` : "sans expiration"}</p>}
        </td>
        <td className="py-3.5 pr-4">{u.admin ? <Pill tone="red"><Shield size={11} /> Admin</Pill> : <span className={`text-xs ${c.faint}`}>—</span>}</td>
        <td className={`py-3.5 pr-4 text-xs ${c.sub}`}>{dateOnly(u.createdAt)}</td>
        <td className={`py-3.5 pr-4 text-xs ${c.sub}`}>{when(u.lastSignInAt)}</td>
        <td className="py-3.5">
          <button onClick={onToggle} aria-expanded={open} aria-label={`Gérer ${u.email}`} className={`p-2 rounded-xl ${open ? "bg-blue-600/10 text-blue-600" : `${c.hoverSoft} ${c.sub}`}`}><Settings2 size={15} /></button>
        </td>
      </tr>
      {open && (
        <tr className={`border-t ${c.border}`}>
          <td colSpan={6} className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {planButton(u, "Premium 1 mois", 1)}
              {planButton(u, "Premium 12 mois", 12)}
              {planButton(u, "Premium illimité", null)}
              {u.plan === "Premium" && (
                <Btn small variant="ghost" disabled={busy} icon={RotateCcw} onClick={() => act({ action: "set-plan", userId: u.id, plan: "Découverte" }, `${u.email} repassé en Découverte.`)}>Retirer Premium</Btn>
              )}
              <Btn small variant="ghost" disabled={busy || isSelf} icon={UserCog}
                onClick={() => act({ action: "set-role", userId: u.id, role: u.admin ? null : "admin" }, u.admin ? `Rôle admin retiré à ${u.email}.` : `${u.email} est maintenant admin.`)}
                title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : undefined}>
                {u.admin ? "Retirer admin" : "Nommer admin"}
              </Btn>
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-600">Supprimer définitivement ce compte et toutes ses données ?</span>
                  <Btn small variant="ghost" className="text-rose-600" disabled={busy} icon={Trash2} onClick={() => act({ action: "delete", userId: u.id }, `Compte ${u.email} supprimé.`)}>Confirmer</Btn>
                  <Btn small variant="ghost" disabled={busy} onClick={onCancelDelete}>Annuler</Btn>
                </span>
              ) : (
                <Btn small variant="ghost" className="text-rose-600" disabled={busy || isSelf} icon={Trash2} onClick={onConfirmDelete}
                  title={isSelf ? "Vous ne pouvez pas supprimer votre propre compte" : undefined}>Supprimer</Btn>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------- promo codes ------------------------------ */

const DURATION_LABELS = { once: "Premier paiement", repeating: "mois", forever: "Tous les paiements" };
const promoDuration = (p) =>
  p.duration === "repeating" ? `${p.durationInMonths} ${DURATION_LABELS.repeating}` : DURATION_LABELS[p.duration] || p.duration;

const EMPTY_PROMO_FORM = { code: "", type: "percent", value: "", duration: "once", months: "3", maxRedemptions: "", expiresAt: "" };

function PromosTab() {
  const { c, notify } = useApp();
  const [codes, setCodes] = useState(null);
  const [state, setState] = useState("loading");
  const [form, setForm] = useState(EMPTY_PROMO_FORM);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setFormError(""); };
  const inp = `px-3.5 py-2.5 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const load = () => {
    listPromoCodes().then((r) => {
      if (r.ok) { setCodes(r.data.codes); setState("ready"); }
      else setState(r.unavailable ? "unavailable" : "error");
    });
  };
  useEffect(load, []);

  const create = async () => {
    if (!form.code.trim()) return setFormError("Indiquez le code (ex. : BIENVENUE20).");
    if (!(Number(form.value) > 0)) return setFormError(form.type === "percent" ? "Indiquez le pourcentage de rabais." : "Indiquez le montant du rabais en dollars.");
    setBusy(true);
    const r = await createPromoCode({
      code: form.code.trim().toUpperCase(),
      ...(form.type === "percent" ? { percentOff: Number(form.value) } : { amountOff: Number(form.value) }),
      duration: form.duration,
      durationInMonths: form.duration === "repeating" ? Number(form.months) : null,
      maxRedemptions: Number(form.maxRedemptions) || null,
      expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
    });
    setBusy(false);
    if (!r.ok) return setFormError(r.error || "Création refusée.");
    notify(`Code ${r.data.code.code} créé.`);
    setForm(EMPTY_PROMO_FORM);
    load();
  };

  const toggle = async (p) => {
    setBusy(true);
    const r = await togglePromoCode(p.id, !p.active);
    setBusy(false);
    if (!r.ok) return notify(r.error || "Action refusée.");
    notify(p.active ? `Code ${p.code} désactivé.` : `Code ${p.code} réactivé.`);
    load();
  };

  if (state === "unavailable") {
    return <UnavailableCard>La gestion des codes promo passe par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>.</UnavailableCard>;
  }
  if (state === "error") return <UnavailableCard>Impossible de charger les codes promo. Vérifiez la clé Stripe et réessayez.</UnavailableCard>;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className={`font-display font-bold mb-1.5 ${c.text}`}>Créer un code promo</h3>
        <p className={`text-sm mb-5 ${c.sub}`}>Le code est créé dans Stripe (coupon + code promotionnel) : limites d'utilisation et expiration sont appliquées par Stripe au moment du paiement. Les clients l'entrent sur la page Tarifs ou directement sur la page de paiement Stripe.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`} htmlFor="promo-code">Code</label>
            <input id="promo-code" value={form.code} onChange={set("code")} placeholder="BIENVENUE20" className={`w-full font-mono2 ${inp}`} />
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`} htmlFor="promo-value">Rabais</label>
            <div className="flex gap-2">
              <input id="promo-value" type="number" min="1" value={form.value} onChange={set("value")} placeholder={form.type === "percent" ? "20" : "5"} className={`w-full ${inp}`} />
              <select value={form.type} onChange={set("type")} aria-label="Type de rabais" className={inp}>
                <option value="percent">%</option>
                <option value="amount">$ CAD</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`} htmlFor="promo-duration">S'applique sur</label>
            <div className="flex gap-2">
              <select id="promo-duration" value={form.duration} onChange={set("duration")} className={`w-full ${inp}`}>
                <option value="once">Le premier paiement</option>
                <option value="repeating">Plusieurs mois</option>
                <option value="forever">Tous les paiements</option>
              </select>
              {form.duration === "repeating" && (
                <input type="number" min="1" max="36" value={form.months} onChange={set("months")} aria-label="Nombre de mois" className={`w-20 ${inp}`} />
              )}
            </div>
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`} htmlFor="promo-max">Limite d'utilisations <span className="normal-case font-medium">(optionnel)</span></label>
            <input id="promo-max" type="number" min="1" value={form.maxRedemptions} onChange={set("maxRedemptions")} placeholder="Illimité" className={`w-full ${inp}`} />
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`} htmlFor="promo-exp">Expire le <span className="normal-case font-medium">(optionnel)</span></label>
            <input id="promo-exp" type="date" value={form.expiresAt} onChange={set("expiresAt")} className={`w-full ${inp}`} />
          </div>
          <div className="flex items-end">
            <Btn icon={Plus} disabled={busy} onClick={create} className="w-full">{busy ? "Création…" : "Créer le code"}</Btn>
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5"><XCircle size={15} /> {formError}</p>}
      </Card>

      <Card className="p-6 overflow-x-auto">
        <h3 className={`font-display font-bold mb-4 ${c.text}`}>Codes existants</h3>
        {state === "loading" || codes === null ? (
          <SkeletonRows n={4} className="h-10" />
        ) : codes.length === 0 ? (
          <EmptyState icon={Ticket} title="Aucun code promo pour l'instant" sub="Créez-en un ci-dessus — il sera utilisable immédiatement sur la page Tarifs." />
        ) : (
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}>
                <th className="pb-3 pr-4 font-semibold">Code</th>
                <th className="pb-3 pr-4 font-semibold">Rabais</th>
                <th className="pb-3 pr-4 font-semibold">S'applique sur</th>
                <th className="pb-3 pr-4 font-semibold">Utilisations</th>
                <th className="pb-3 pr-4 font-semibold">Expire</th>
                <th className="pb-3 pr-4 font-semibold">Statut</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((p) => (
                <tr key={p.id} className={`border-t ${c.border}`}>
                  <td className={`py-3 pr-4 font-mono2 font-semibold ${c.text}`}>{p.code}</td>
                  <td className="py-3 pr-4"><Pill tone="blue">{promoLabel(p)}</Pill></td>
                  <td className={`py-3 pr-4 text-xs ${c.sub}`}>{promoDuration(p)}</td>
                  <td className={`py-3 pr-4 text-xs font-mono2 ${c.sub}`}>{p.timesRedeemed}{p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}</td>
                  <td className={`py-3 pr-4 text-xs ${c.sub}`}>{p.expiresAt ? dateOnly(p.expiresAt) : "—"}</td>
                  <td className="py-3 pr-4"><Pill tone={p.active ? "green" : "slate"}>{p.active ? "Actif" : "Inactif"}</Pill></td>
                  <td className="py-3">
                    <Btn small variant="ghost" disabled={busy} className={p.active ? "text-rose-600" : ""} onClick={() => toggle(p)}>
                      {p.active ? "Désactiver" : "Réactiver"}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------- usage --------------------------------- */

const fmtBytes = (n) => {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Go`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} Mo`;
  return `${Math.round(n / 1e3)} ko`;
};
const fmtTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} k` : String(n ?? 0));

// Supabase Free plan ceilings; adjust if the project is upgraded (values
// shown as denominators, they don't gate anything).
const SUPABASE_LIMITS = { dbBytes: 500e6, storageBytes: 1e9, mau: 50000 };

function LimitBar({ label, used, limit, format }) {
  const { c } = useApp();
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${c.sub}`}>{label}</span>
        <span className={`font-mono2 font-semibold ${pct >= 90 ? "text-rose-600" : pct >= 70 ? "text-amber-600" : c.text}`}>
          {format(used)} / {format(limit)} · {pct} %
        </span>
      </div>
      <ProgressBar pct={pct} tone={pct >= 70 ? "blue" : "grad"} />
    </div>
  );
}

function UsageTab() {
  const { c } = useApp();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    fetchAdminUsage().then((r) => {
      if (r.ok) { setData(r.data); setState("ready"); }
      else setState(r.unavailable ? "unavailable" : "error");
    });
  }, []);

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <Card className="p-6"><Skeleton className="h-5 w-64 mb-5" /><SkeletonRows n={3} className="h-8" /></Card>
        <Card className="p-6"><Skeleton className="h-5 w-64 mb-5" /><SkeletonRows n={3} className="h-8" /></Card>
      </div>
    );
  }
  if (state === "unavailable") {
    return <UnavailableCard>Le suivi d'utilisation passe par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>.</UnavailableCard>;
  }
  if (state === "error") return <UnavailableCard>Impossible de charger l'utilisation. Réessayez.</UnavailableCard>;

  const { ai, platform, mau } = data;
  const storageTotal = platform ? (platform.storage || []).reduce((s, b) => s + (b.bytes || 0), 0) : null;

  return (
    <div className="space-y-4">
      {/* ── IA (Groq) ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
          <h3 className={`font-display font-bold ${c.text}`}>IA — Groq (30 derniers jours)</h3>
          <a href="https://console.groq.com/settings/billing" target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
            Facturation exacte sur console.groq.com <ExternalLink size={12} />
          </a>
        </div>
        <p className={`text-sm mb-5 ${c.sub}`}>Mesuré par la plateforme elle-même : chaque appel des ateliers d'expression est journalisé (Groq n'expose pas d'API d'utilisation).</p>
        {!ai ? (
          <p className={`text-sm py-4 text-center ${c.faint}`}>Aucune donnée — appliquez la migration <span className="font-mono2">20260715_usage_tracking.sql</span> ; les appels seront comptés à partir de là.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                [ai.calls30d, "Appels IA (30 j)", ai.calls7d > 0 ? `${ai.calls7d} ces 7 derniers jours` : null],
                [fmtTokens(ai.promptTokens30d), "Jetons d'entrée", null],
                [fmtTokens(ai.completionTokens30d), "Jetons de sortie", null],
                [ai.transcriptions30d, "Transcriptions audio", `${fmtBytes(ai.audioBytes30d)} envoyés`],
              ].map(([v, l, h]) => (
                <div key={l}>
                  <p className="font-display font-extrabold text-2xl grad-text">{v}</p>
                  <p className={`text-sm font-medium mt-0.5 ${c.text}`}>{l}</p>
                  {h && <p className={`text-xs mt-0.5 ${c.faint}`}>{h}</p>}
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${c.faint}`}>Appels par jour — 14 jours</p>
                <DayBars days={ai.callsByDay} label="Appels IA par jour sur 14 jours" />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${c.faint}`}>Plus gros utilisateurs (30 j)</p>
                {ai.topUsers.length === 0 ? (
                  <p className={`text-sm py-4 text-center ${c.faint}`}>Aucun appel sur la période.</p>
                ) : (
                  <div className="space-y-1">
                    {ai.topUsers.map((u) => (
                      <div key={u.email} className={`flex items-center justify-between px-3 py-2 rounded-xl ${c.hoverSoft}`}>
                        <span className={`text-sm truncate ${c.text}`}>{u.email}</span>
                        <span className={`text-xs font-mono2 shrink-0 ${c.sub}`}>{u.calls} appel{u.calls > 1 ? "s" : ""} · {fmtTokens(u.tokens)} jetons</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Supabase ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
          <h3 className={`font-display font-bold ${c.text}`}>Supabase — consommation du forfait</h3>
          <a href="https://supabase.com/dashboard/project/_/settings/billing/usage" target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
            Détail complet (dont l'egress) sur supabase.com <ExternalLink size={12} />
          </a>
        </div>
        <p className={`text-sm mb-5 ${c.sub}`}>Mesuré depuis la base elle-même. Les plafonds affichés sont ceux du forfait Free — ajustez <span className="font-mono2">SUPABASE_LIMITS</span> si le projet passe au forfait Pro.</p>
        {!platform ? (
          <p className={`text-sm py-4 text-center ${c.faint}`}>Aucune donnée — appliquez la migration <span className="font-mono2">20260715_usage_tracking.sql</span> (fonction <span className="font-mono2">admin_platform_usage</span>).</p>
        ) : (
          <div className="space-y-5">
            <LimitBar label="Base de données" used={platform.db_bytes || 0} limit={SUPABASE_LIMITS.dbBytes} format={fmtBytes} />
            <LimitBar label="Stockage (tous les buckets)" used={storageTotal || 0} limit={SUPABASE_LIMITS.storageBytes} format={fmtBytes} />
            <LimitBar label="Utilisateurs actifs mensuels (MAU)" used={mau || 0} limit={SUPABASE_LIMITS.mau} format={(n) => String(Math.round(n))} />
            {(platform.storage || []).length > 0 && (
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${c.faint}`}>Stockage par bucket</p>
                {(platform.storage || []).map((b) => (
                  <div key={b.bucket} className={`flex items-center justify-between px-3 py-2 rounded-xl ${c.hoverSoft}`}>
                    <span className={`text-sm font-mono2 ${c.text}`}>{b.bucket}</span>
                    <span className={`text-xs font-mono2 ${c.sub}`}>{fmtBytes(b.bytes)} · {b.files} fichier{b.files > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* --------------------------------- messages ------------------------------- */

const MSG_FILTERS = [["new", "Nouveaux"], ["resolved", "Résolus"], ["archived", "Archivés"], ["all", "Tous"]];
const MSG_TONES = { new: "amber", resolved: "green", archived: "slate" };
const MSG_LABELS = { new: "Nouveau", resolved: "Résolu", archived: "Archivé" };

function MessagesTab({ onCount }) {
  const { c, notify } = useApp();
  const [messages, setMessages] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("new");

  const load = () => listContactMessages().then((r) => {
    setMessages(r.messages);
    setUnavailable(!r.ok);
    onCount?.((r.messages || []).filter((m) => m.status === "new").length); // keep the sidebar badge in sync
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const patch = async (id, status, msg) => {
    const r = await setMessageStatus(id, status);
    notify(r.ok ? msg : "Action refusée.");
    load();
  };
  const remove = async (id) => {
    const r = await deleteMessage(id);
    notify(r.ok ? "Message supprimé." : "Suppression refusée.");
    load();
  };

  if (unavailable) {
    return <UnavailableCard>La boîte de réception nécessite la table <span className="font-mono2">contact_messages</span> — appliquez la migration <span className="font-mono2">20260715_admin.sql</span>.</UnavailableCard>;
  }
  const list = (messages || []).filter((m) => filter === "all" || m.status === filter);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {MSG_FILTERS.map(([id, l]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {l}{id !== "all" && messages ? ` · ${messages.filter((m) => m.status === id).length}` : ""}
          </button>
        ))}
      </div>
      <Card className="p-6">
        {messages === null ? (
          <SkeletonRows n={4} className="h-24" />
        ) : list.length === 0 ? (
          <EmptyState icon={Inbox} title={filter === "new" ? "File de modération vide. Beau travail !" : "Aucun message dans cette catégorie."} sub={filter === "new" ? "Les nouveaux messages du formulaire de contact apparaîtront ici." : null} />
        ) : (
          <div className="space-y-2">
            {list.map((m) => (
              <div key={m.id} className={`p-4 rounded-2xl border ${m.status === "new" ? "border-amber-500/40 bg-amber-500/5" : c.border}`}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Pill tone={MSG_TONES[m.status]}>{MSG_LABELS[m.status]}</Pill>
                  <span className={`text-sm font-semibold ${c.text}`}>{m.name}</span>
                  <span className={`text-xs ${c.faint}`}>{m.email} · {when(m.created_at)}</span>
                </div>
                {m.subject && <p className={`text-sm font-semibold ${c.text}`}>{m.subject}</p>}
                <p className={`text-sm mt-1 whitespace-pre-wrap ${c.sub}`}>{m.message}</p>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "votre message à Passerelle"}`)}`} className={`p-2 rounded-xl ${c.hoverSoft} text-blue-600`} aria-label="Répondre par courriel" title="Répondre par courriel"><Mail size={15} /></a>
                  {m.status !== "resolved" && <button onClick={() => patch(m.id, "resolved", "Message marqué résolu.")} className={`p-2 rounded-xl ${c.hoverSoft} text-emerald-500`} aria-label="Marquer résolu" title="Marquer résolu"><Check size={16} /></button>}
                  {m.status !== "archived" && <button onClick={() => patch(m.id, "archived", "Message archivé.")} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`} aria-label="Archiver" title="Archiver"><Archive size={15} /></button>}
                  {m.status !== "new" && <button onClick={() => patch(m.id, "new", "Message remis en file.")} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`} aria-label="Remettre en file" title="Remettre en file"><RotateCcw size={15} /></button>}
                  <button onClick={() => remove(m.id)} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`} aria-label="Supprimer" title="Supprimer"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* --------------------------------- audit log ------------------------------ */

const AUDIT_LABELS = {
  "set-plan": ["Forfait modifié", "blue"],
  "set-role": ["Rôle modifié", "red"],
  "delete-user": ["Compte supprimé", "amber"],
  "create-promo": ["Code promo créé", "green"],
  "toggle-promo": ["Code promo modifié", "slate"],
};

function AuditTab() {
  const { c } = useApp();
  const [entries, setEntries] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { listAuditLog().then((r) => { setEntries(r.entries); setUnavailable(!r.ok); }); }, []);

  if (unavailable) {
    return <UnavailableCard>Le journal nécessite la table <span className="font-mono2">admin_audit_log</span> — appliquez la migration <span className="font-mono2">20260715_admin.sql</span>.</UnavailableCard>;
  }
  const detailText = (e) => {
    if (!e.detail) return "";
    if (e.action === "set-plan") return e.detail.plan === "Premium" ? `Premium ${e.detail.months ? `${e.detail.months} mois` : "illimité"}` : "Découverte";
    if (e.action === "set-role") return e.detail.role === "admin" ? "promu admin" : "rôle retiré";
    return "";
  };
  return (
    <Card className="p-6 overflow-x-auto">
      <h3 className={`font-display font-bold mb-1.5 ${c.text}`}>Journal des actions administrateur</h3>
      <p className={`text-sm mb-5 ${c.sub}`}>Trace en lecture seule, écrite par le serveur : qui a modifié quel compte, quand. Les 100 dernières entrées.</p>
      {entries === null ? (
        <SkeletonRows n={5} className="h-9" />
      ) : entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune action enregistrée pour l'instant" sub="Chaque modification de forfait, de rôle ou de code promo laissera une trace ici." />
      ) : (
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}>
              <th className="pb-3 pr-4 font-semibold">Date</th>
              <th className="pb-3 pr-4 font-semibold">Administrateur</th>
              <th className="pb-3 pr-4 font-semibold">Action</th>
              <th className="pb-3 pr-4 font-semibold">Compte visé</th>
              <th className="pb-3 font-semibold">Détail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const [label, tone] = AUDIT_LABELS[e.action] || [e.action, "slate"];
              return (
                <tr key={e.id} className={`border-t ${c.border}`}>
                  <td className={`py-3 pr-4 text-xs ${c.sub}`}>{when(e.created_at)}</td>
                  <td className={`py-3 pr-4 ${c.text}`}>{e.actor_email || "—"}</td>
                  <td className="py-3 pr-4"><Pill tone={tone}>{label}</Pill></td>
                  <td className={`py-3 pr-4 ${c.sub}`}>{e.target || "—"}</td>
                  <td className={`py-3 text-xs ${c.faint}`}>{detailText(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ---------------------------------- page ---------------------------------- */

export function Admin() {
  const { c, customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useApp();
  const [tab, setTab] = useState("overview");
  const [newMessages, setNewMessages] = useState(0);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  // Sidebar badge: loaded once here (client-direct through the admin RLS
  // policy, so it works even without the serverless routes), then kept in
  // sync by MessagesTab whenever the inbox (re)loads.
  useEffect(() => {
    listContactMessages().then((r) => setNewMessages((r.messages || []).filter((m) => m.status === "new").length));
  }, []);

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result));
    reader.readAsText(file);
  };
  const runImport = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      const normalized = normalizeImportedQuestions(parsed);
      addListeningQuestions(normalized);
      setImportText("");
    } catch (err) {
      setImportError(err.message || "JSON invalide.");
    }
  };

  const tabs = [
    { id: "overview", l: "Aperçu", icon: LayoutDashboard },
    { id: "users", l: "Utilisateurs", icon: Users },
    { id: "questions", l: "Questions", icon: FileText },
    { id: "import", l: "Importer (CO)", icon: Upload },
    { id: "messages", l: "Messages", icon: MessageCircle },
    { id: "promos", l: "Promos", icon: Ticket },
    { id: "usage", l: "Utilisation", icon: Gauge },
    { id: "audit", l: "Journal", icon: ScrollText },
  ];

  return (
    <PageShell back wide eyebrow="Panneau d'administration" title="Gestion de la plateforme" sub="Statistiques, comptes, questions et messages — connectés en direct à la base de données.">
      {/* Console layout: sticky section rail on desktop, horizontally
          scrollable chip row on mobile. The Messages entry carries a live
          unread badge. */}
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
        <nav role="tablist" aria-label="Sections d'administration" className="lg:sticky lg:top-24 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 shrink-0 lg:w-full px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors
                ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
                <t.icon size={16} className="shrink-0" />
                <span className="flex-1 text-left whitespace-nowrap">{t.l}</span>
                {t.id === "messages" && newMessages > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center ${active ? "bg-white/25 text-white" : "bg-rose-600 text-white"}`}>
                    {newMessages > 9 ? "9+" : newMessages}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div role="tabpanel" className="min-w-0">
      {tab === "overview" && <OverviewTab go={setTab} />}
      {tab === "users" && <UsersTab />}
      {tab === "questions" && <QuestionManager />}
      {tab === "import" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-1.5 ${c.text}`}>Importer des questions de compréhension orale</h3>
            <p className={`text-sm mb-4 ${c.sub}`}>Collez un tableau JSON de questions, ou téléversez un fichier .json. Chaque question doit avoir un énoncé et une liste d'alternatives ; l'audio et l'explication sont optionnels.</p>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Btn small variant="ghost" icon={Upload} onClick={() => fileInputRef.current?.click()}>Choisir un fichier .json</Btn>
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" aria-label="Téléverser un fichier JSON" />
                <Btn small variant="ghost" icon={FileText} onClick={() => setImportText(IMPORT_SAMPLE)}>Charger un exemple</Btn>
              </div>
              <textarea value={importText} onChange={(e) => { setImportText(e.target.value); setImportError(""); }} rows={12} placeholder='[{ "audio": "https://…mp3", "question": "…", "alternatives": ["…","…","…","…"], "answer_index": 0, "explanation": "…", "level": "B1" }]' aria-label="JSON des questions" className={`w-full px-4 py-3 rounded-2xl border font-mono2 text-xs outline-none focus:border-blue-600 ${c.inputCls}`} />
              {importError && <p className="text-sm text-rose-600 flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5" />{importError}</p>}
              <Btn small icon={Upload} onClick={runImport} disabled={!importText.trim()}>Importer ces questions</Btn>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display font-bold ${c.text}`}>Questions importées ({customListen.length})</h3>
              {customListen.length > 0 && <button onClick={clearListeningQuestions} className="text-xs font-semibold text-rose-600 hover:underline">Tout effacer</button>}
            </div>
            {customListen.length === 0 ? (
              <p className={`text-sm py-6 text-center ${c.faint}`}>Aucune question importée pour l'instant. Elles apparaîtront automatiquement sur la page « Compréhension orale ».</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customListen.map((q) => (
                  <div key={q.id} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${c.border}`}>
                    <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Headphones size={15} /></span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${c.text}`}>{q.q}</p>
                      <p className={`text-xs font-mono2 ${c.faint}`}>{q.audio ? "Audio lié" : "Sans audio"} · niveau {q.level} · {q.opts.length} choix</p>
                    </div>
                    <button aria-label="Supprimer cette question" onClick={() => removeListeningQuestion(q.id)} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600 shrink-0`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <p className={`mt-4 text-xs ${c.faint} flex items-start gap-1.5`}><Shield size={13} className="mt-0.5 shrink-0" /> Pour la banque officielle (avec versionnage et analytique), utilisez plutôt l'onglet « Questions ».</p>
          </Card>
        </div>
      )}
      {tab === "messages" && <MessagesTab onCount={setNewMessages} />}
      {tab === "promos" && <PromosTab />}
      {tab === "usage" && <UsageTab />}
      {tab === "audit" && <AuditTab />}
        </div>
      </div>
    </PageShell>
  );
}
