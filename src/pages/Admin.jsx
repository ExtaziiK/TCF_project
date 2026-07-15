import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Users, FileText, Upload, MessageCircle, ScrollText,
  TrendingUp, Trash2, Check, XCircle, Shield, Headphones, Search, Crown, UserCog,
  ChevronLeft, ChevronRight, Mail, Archive, RotateCcw, CloudOff, ExternalLink, Settings2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { IMPORT_SAMPLE } from "@/constants/listeningImport";
import { normalizeImportedQuestions } from "@/utils/questionImport";
import { QuestionManager } from "@/components/admin/QuestionManager";
import { DayBars } from "@/components/dashboard/charts";
import {
  fetchAdminStats, listAdminUsers, updateAdminUser,
  listContactMessages, setMessageStatus, deleteMessage, listAuditLog,
} from "@/services/adminService";

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

/* --------------------------------- overview ------------------------------- */

function StatCard({ value, label, hint }) {
  const { c } = useApp();
  return (
    <Card className="p-5">
      <p className="font-display font-extrabold text-3xl grad-text">{value}</p>
      <p className={`text-sm font-medium mt-1 ${c.text}`}>{label}</p>
      {hint && <p className="text-xs mt-1 text-emerald-500 font-medium flex items-center gap-1"><TrendingUp size={12} />{hint}</p>}
    </Card>
  );
}

function OverviewTab() {
  const { c } = useApp();
  const [stats, setStats] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    fetchAdminStats().then((r) => {
      if (r.ok) { setStats(r.data); setState("ready"); }
      else setState(r.unavailable ? "unavailable" : "error");
    });
  }, []);

  if (state === "loading") return <Card className="p-10 text-center"><p className={`text-sm ${c.faint}`}>Chargement des statistiques…</p></Card>;
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
        <StatCard value={u.total} label="Utilisateurs inscrits" hint={u.new7d > 0 ? `+${u.new7d} ces 7 derniers jours` : null} />
        <StatCard value={u.premium} label="Abonnés Premium actifs" hint={`${conversion} % des comptes`} />
        <StatCard value={a.quizzesTotal} label="Quiz complétés" hint={a.quizzes7d > 0 ? `+${a.quizzes7d} ces 7 derniers jours` : null} />
        <StatCard value={a.examsCompleted} label="TCF blancs terminés" hint={a.examsTotal > a.examsCompleted ? `${a.examsTotal - a.examsCompleted} en cours` : null} />
        <StatCard value={a.questionAttempts} label="Réponses enregistrées" />
        <StatCard value={stats.messagesNew} label="Messages à traiter" />
      </div>
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
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setSearch(query.trim()); } }}
          placeholder="Rechercher par courriel, nom ou nom d'utilisateur…"
          aria-label="Rechercher un utilisateur"
          className={`flex-1 bg-transparent text-sm outline-none ${c.text}`}
        />
        <Btn small variant="ghost" onClick={() => { setPage(1); setSearch(query.trim()); }}>Rechercher</Btn>
        {search && <Btn small variant="ghost" onClick={() => { setQuery(""); setSearch(""); setPage(1); }}>Effacer</Btn>}
      </Card>

      <Card className="p-6 overflow-x-auto">
        {state === "loading" || !data ? (
          <p className={`text-sm py-8 text-center ${c.faint}`}>Chargement des comptes…</p>
        ) : data.users.length === 0 ? (
          <p className={`text-sm py-8 text-center ${c.faint}`}>Aucun compte ne correspond à cette recherche.</p>
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
      <tr className={`border-t ${c.border}`}>
        <td className="py-3.5 pr-4">
          <p className={`font-medium ${c.text}`}>{u.name || u.username || "—"}{isSelf && <span className="ml-2 text-[10px] font-bold text-blue-600">VOUS</span>}</p>
          <p className={`text-xs ${c.faint}`}>{u.email}{u.username ? ` · @${u.username}` : ""}</p>
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

/* --------------------------------- messages ------------------------------- */

const MSG_FILTERS = [["new", "Nouveaux"], ["resolved", "Résolus"], ["archived", "Archivés"], ["all", "Tous"]];
const MSG_TONES = { new: "amber", resolved: "green", archived: "slate" };
const MSG_LABELS = { new: "Nouveau", resolved: "Résolu", archived: "Archivé" };

function MessagesTab() {
  const { c, notify } = useApp();
  const [messages, setMessages] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("new");

  const load = () => listContactMessages().then((r) => { setMessages(r.messages); setUnavailable(!r.ok); });
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
          <p className={`text-sm py-8 text-center ${c.faint}`}>Chargement…</p>
        ) : list.length === 0 ? (
          <p className={`text-sm py-8 text-center ${c.faint}`}>{filter === "new" ? "File de modération vide. Beau travail !" : "Aucun message dans cette catégorie."}</p>
        ) : (
          <div className="space-y-2">
            {list.map((m) => (
              <div key={m.id} className={`p-4 rounded-2xl border ${c.border}`}>
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
        <p className={`text-sm py-8 text-center ${c.faint}`}>Chargement…</p>
      ) : entries.length === 0 ? (
        <p className={`text-sm py-8 text-center ${c.faint}`}>Aucune action enregistrée pour l'instant.</p>
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
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

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
    { id: "audit", l: "Journal", icon: ScrollText },
  ];

  return (
    <PageShell back wide eyebrow="Panneau d'administration" title="Gestion de la plateforme" sub="Statistiques, comptes, questions et messages — connectés en direct à la base de données.">
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${tab === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <t.icon size={15} />{t.l}
          </button>
        ))}
      </div>
      {tab === "overview" && <OverviewTab />}
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
      {tab === "messages" && <MessagesTab />}
      {tab === "audit" && <AuditTab />}
    </PageShell>
  );
}
