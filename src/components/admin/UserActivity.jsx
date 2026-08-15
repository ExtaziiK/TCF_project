import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, UserPlus, ListChecks, Trophy, Sparkles, XCircle, Headphones, Inbox,
  Wallet, Quote, MessageCircle, FileText, Shield, Crown, Clock,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Pill } from "@/components/common";
import { fetchUserActivity } from "@/services/adminService";

// What one candidate has actually done, read from the tables the platform
// already writes (api/_lib/admin/activity.js). A slide-over rather than a
// modal: the admin keeps scanning the user list with it open.

const TYPES = {
  signup: { icon: UserPlus, tone: "text-blue-600", group: "compte" },
  quiz: { icon: ListChecks, tone: "text-blue-600", group: "entrainement" },
  exam: { icon: Trophy, tone: "text-amber-600", group: "entrainement" },
  exam_done: { icon: Trophy, tone: "text-emerald-600", group: "entrainement" },
  dictee: { icon: Headphones, tone: "text-violet-600", group: "entrainement" },
  ai: { icon: Sparkles, tone: "text-indigo-600", group: "ia" },
  ai_failed: { icon: XCircle, tone: "text-rose-600", group: "ia" },
  request: { icon: Inbox, tone: "text-amber-600", group: "argent" },
  payment: { icon: Wallet, tone: "text-emerald-600", group: "argent" },
  testimonial: { icon: Quote, tone: "text-violet-600", group: "compte" },
  message: { icon: MessageCircle, tone: "text-blue-600", group: "compte" },
  terms: { icon: FileText, tone: "text-slate-500", group: "compte" },
  admin_action: { icon: Shield, tone: "text-rose-600", group: "compte" },
};

// Thirteen event types is too many chips to scan, and the questions an admin
// actually asks are coarser than the types.
const GROUPS = [
  { key: "all", label: "Tout" },
  { key: "entrainement", label: "Entraînement" },
  { key: "ia", label: "IA" },
  { key: "argent", label: "Paiements" },
  { key: "compte", label: "Compte" },
];

const compact = (n) => (n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)} k` : String(n));
const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString("fr-CA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const timeLabel = (iso) => new Date(iso).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

function Tile({ label, value, hint }) {
  const { c } = useApp();
  return (
    <div className={`rounded-2xl border ${c.border} px-3 py-2.5`}>
      <p className={`text-[10px] uppercase tracking-wider font-semibold ${c.faint}`}>{label}</p>
      <p className={`font-mono2 font-extrabold text-lg leading-tight ${c.text}`}>{value}</p>
      {hint && <p className={`text-[11px] ${c.faint}`}>{hint}</p>}
    </div>
  );
}

function Summary({ s }) {
  const { c } = useApp();
  const q = s.quizzes, ai = s.ai;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Tile label="Quiz" value={q.count} hint={q.avgPct != null ? `${q.avgPct} % en moyenne` : "aucun score"} />
        {/* Answered, not seen: a candidate who clicks through a quiz without
            answering leaves attempts behind, and calling those 0 % correct
            would be wrong twice over. */}
        <Tile label="Questions" value={compact(s.questions.answered)}
          hint={s.questions.pct != null ? `${s.questions.pct} % correctes` : s.questions.skipped ? `${s.questions.skipped} passées` : "—"} />
        <Tile label="TCF blanc" value={`${s.exams.completed}/${s.exams.started}`} hint="terminés / commencés" />
        <Tile label="Dictées" value={s.dictees.count} hint={s.dictees.avgScore != null ? `${s.dictees.avgScore} % en moyenne` : "—"} />
        <Tile label="Analyses IA" value={ai.analyses} hint={ai.dialogueTurns ? `+ ${ai.dialogueTurns} tours de dialogue` : "hors dialogue"} />
        <Tile label="Encaissé" value={s.money.paidDzd ? `${s.money.paidDzd.toLocaleString("fr-CA")} DA` : "—"} hint={`${s.money.requests} demande${s.money.requests > 1 ? "s" : ""}`} />
      </div>

      {/* The breakdown the Utilisation tab cannot give: an "appel" is a Groq
          call, and one candidate action costs one to three of them. */}
      {ai.byEndpoint.length > 0 && (
        <div className={`rounded-2xl border ${c.border} p-3`}>
          <div className="flex items-baseline gap-2 mb-2">
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${c.faint}`}>Appels IA par épreuve</p>
            <span className={`ml-auto text-[11px] font-mono2 ${c.faint}`}>
              {ai.calls} appels · {compact(ai.tokens)} jetons{ai.failures ? ` · ${ai.failures} refusés` : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {ai.byEndpoint.map((e) => (
              <div key={e.endpoint} className="flex items-center gap-2">
                <span className={`text-xs flex-1 truncate ${c.sub}`}>{e.label}</span>
                <span className={`text-xs font-mono2 ${c.text}`}>{e.calls}</span>
                <span className={`text-[11px] font-mono2 w-16 text-right ${c.faint}`}>{compact(e.tokens)} jet.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ e }) {
  const { c } = useApp();
  const cfg = TYPES[e.type] || { icon: Clock, tone: c.faint };
  const Icon = cfg.icon;
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={`mt-0.5 shrink-0 ${cfg.tone}`}><Icon size={15} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-snug ${c.text}`}>{e.title}</p>
        {e.detail && <p className={`text-xs leading-snug ${c.faint}`}>{e.detail}</p>}
        {e.meta?.reason && <p className="text-[11px] font-mono2 text-rose-600/80 truncate">{e.meta.reason}</p>}
      </div>
      <span className={`text-[11px] font-mono2 shrink-0 ${c.faint}`}>{timeLabel(e.at)}</span>
    </li>
  );
}

export function UserActivityPanel({ userId, onClose }) {
  const { c } = useApp();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [group, setGroup] = useState("all");
  const [moreBusy, setMoreBusy] = useState(false);

  const load = useCallback((offset = 0) => {
    if (offset) setMoreBusy(true); else setState("loading");
    fetchUserActivity({ userId, offset }).then((r) => {
      if (r.ok) {
        setData((prev) =>
          offset && prev ? { ...prev, events: [...prev.events, ...r.data.events], nextOffset: r.data.nextOffset } : r.data);
        setState("ready");
      } else setState(r.unavailable ? "unavailable" : "error");
      setMoreBusy(false);
    });
  }, [userId]);

  useEffect(() => { setData(null); setGroup("all"); load(0); }, [load]);

  // Escape closes, and the list behind must not scroll while the panel is up.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const u = data?.user;
  const shown = (data?.events || []).filter((e) => group === "all" || TYPES[e.type]?.group === group);

  // Group into calendar days, preserving the newest-first order the server sent.
  const days = [];
  for (const e of shown) {
    const key = new Date(e.at).toDateString();
    if (!days.length || days[days.length - 1].key !== key) days.push({ key, at: e.at, events: [e] });
    else days[days.length - 1].events.push(e);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex justify-end"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Activité du compte">
      <div className={`w-full max-w-xl h-full flex flex-col border-l ${c.border} ${c.card} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}>

        <div className={`flex items-start gap-3 px-5 py-4 border-b ${c.border} shrink-0`}>
          <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center shrink-0">
            {(u?.name || u?.username || u?.email || "?").trim()[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`font-display font-bold truncate ${c.text}`}>{u?.name || u?.username || u?.email || "…"}</h2>
            <p className={`text-xs truncate ${c.faint}`}>{u?.email}{u?.username ? ` · @${u.username}` : ""}</p>
          </div>
          {u && (
            <Pill tone={u.plan === "Premium" ? "gold" : "slate"}>
              {u.plan === "Premium" ? <><Crown size={11} /> {u.planLabel || "Premium"}</> : "Basic"}
            </Pill>
          )}
          <button onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-full ${c.hoverSoft} ${c.sub}`}><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {state === "loading" && <p className={`text-sm ${c.faint}`}>Chargement de l'activité…</p>}
          {state === "unavailable" && (
            <p className={`text-sm ${c.sub}`}>
              L'activité passe par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>.
            </p>
          )}
          {state === "error" && <p className={`text-sm ${c.sub}`}>Impossible de charger l'activité de ce compte.</p>}

          {state === "ready" && data && (
            <>
              {data.summary && <Summary s={data.summary} />}

              <div className="flex flex-wrap gap-1.5">
                {GROUPS.map((g) => (
                  <button key={g.key} onClick={() => setGroup(g.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      group === g.key ? "bg-blue-600 text-white border-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}>
                    {g.label}
                  </button>
                ))}
              </div>

              {days.length === 0 ? (
                <p className={`text-sm ${c.faint}`}>Aucune activité dans cette catégorie.</p>
              ) : (
                days.map((d) => (
                  <div key={d.key}>
                    <p className={`text-[11px] uppercase tracking-wider font-semibold mb-1 ${c.faint}`}>{dayLabel(d.at)}</p>
                    <ul className={`divide-y ${c.border}`}>
                      {d.events.map((e) => <EventRow key={e.id} e={e} />)}
                    </ul>
                  </div>
                ))
              )}

              <div className="flex flex-col items-center gap-2 pt-1">
                {data.nextOffset != null && (
                  <Btn small variant="ghost" disabled={moreBusy} onClick={() => load(data.nextOffset)}>
                    {moreBusy ? "Chargement…" : "Charger plus"}
                  </Btn>
                )}
                {data.truncated && data.nextOffset == null && (
                  <p className={`text-[11px] text-center ${c.faint}`}>
                    Historique tronqué : seules les entrées les plus récentes de chaque source sont chargées.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
