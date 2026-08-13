import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { fetchAdminStatDetail } from "@/services/adminService";
import { getBank } from "@/services/bankService";

// What is behind one number on the overview. Clicking a stat card opens this
// pop-up, which lists the accounts (or the rows) the counter is made of —
// "3 connectés maintenant" becomes the three names.
//
// The lists are read-only and carry no content: labels, scores and timestamps
// only, exactly like the rest of the admin dashboard (see the note in
// api/_lib/admin/stats.js). Every key maps to a full tab that can do more, so
// each pop-up offers the jump rather than duplicating the tab's controls.

const GO_LABELS = {
  users: ["users", "Gérer les comptes"],
  online: ["users", "Voir les comptes"],
  premium: ["users", "Gérer les abonnements"],
  messages: ["messages", "Ouvrir la boîte de réception"],
};

const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Under a minute the exact clock time is noise — "à l'instant" is the answer.
const ago = (iso) => {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  if (ms < 60_000) return "à l'instant";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `il y a ${min} min`;
  return dateTime(iso);
};

const initial = (s) => (s || "?").trim()[0]?.toUpperCase() || "?";

// question_attempts stores the bank's own question id, and that id cannot be
// read as a label: it is bank-<section>-<exam_id ?? fileName>-<question id>
// (src/utils/bankAdapter.js), so a CE question comes out as "bank-ce-37-1409"
// where 37 is the source export's exam_id — not quiz 37. The browser bundles
// the whole bank, so the quiz and the question's real position are looked up
// rather than parsed out of the id. Built on open (admin-authored quizzes are
// merged into the bank at app start, and again after any QMS change).
function buildQuestionIndex() {
  const index = new Map();
  for (const [section, quizzes] of Object.entries(getBank())) {
    for (const quiz of quizzes) {
      const name = quiz.quizNumber != null ? `Quiz ${quiz.quizNumber}` : quiz.title;
      quiz.questions.forEach((q, i) => index.set(q.id, `${section.toUpperCase()} — ${name} · question ${i + 1}`));
    }
  }
  return index;
}

function Row({ row, avatar, label }) {
  const { c } = useApp();
  return (
    <li className="flex items-center gap-3 py-2.5">
      {avatar ? (
        <span className="w-8 h-8 rounded-full grad-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0">
          {initial(label)}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${c.text}`}>{label || "—"}</p>
        {row.sub && <p className={`text-xs truncate ${c.faint}`}>{row.sub}</p>}
      </div>
      <div className="shrink-0 text-right">
        {row.pill && <Pill tone={row.tone || "slate"}>{row.pill}</Pill>}
        {row.at && (
          <p className={`text-[11px] font-mono2 mt-1 ${c.faint}`}>
            {/* "vu" is the live list: minutes matter there, not the date. */}
            {row.right === "vu" ? ago(row.at) : `${row.right ? `${row.right} ` : ""}${dateTime(row.at)}`}
          </p>
        )}
        {!row.at && row.right && <p className={`text-[11px] mt-1 ${c.faint}`}>{row.right}</p>}
      </div>
    </li>
  );
}

export function StatDetailModal({ statKey, fallbackTitle, onClose, go }) {
  const { c } = useApp();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  // Only the answers list carries bank ids; no other pop-up pays for the index.
  const questions = useMemo(() => (statKey === "attempts" ? buildQuestionIndex() : null), [statKey]);

  const load = useCallback(async (manual = false) => {
    if (manual) setBusy(true);
    const r = await fetchAdminStatDetail(statKey);
    if (r.ok) { setData(r.data); setState("ready"); }
    else setState((s) => (s === "ready" ? s : r.unavailable ? "unavailable" : "error"));
    setBusy(false);
  }, [statKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [tab, goLabel] = GO_LABELS[statKey] || [];
  const title = data?.title || fallbackTitle || "Détail";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto"
      role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-xl rise max-h-[82vh] flex flex-col overflow-hidden">
        <div className={`flex items-start gap-3 px-5 py-4 border-b ${c.border} shrink-0`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <h3 className={`font-display font-bold text-lg truncate ${c.text}`}>{title}</h3>
              {data && <span className="font-mono2 font-extrabold text-lg grad-text shrink-0">{data.total}</span>}
            </div>
            {data?.subtitle && <p className={`text-xs mt-0.5 ${c.faint}`}>{data.subtitle}</p>}
          </div>
          <button onClick={() => load(true)} aria-label="Actualiser" disabled={busy}
            className={`p-2 rounded-full ${c.hoverSoft} ${c.faint}`}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          </button>
          <button onClick={onClose} aria-label="Fermer" className={`p-2 rounded-full ${c.hoverSoft} ${c.faint}`}><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-2">
          {state === "loading" && <p className={`text-sm py-6 text-center ${c.faint}`}>Chargement…</p>}
          {state === "unavailable" && (
            <p className={`text-sm py-6 ${c.sub}`}>
              Ce détail passe par les fonctions serverless (<span className="font-mono2">/api/admin</span>), absentes en dev local <span className="font-mono2">vite</span>.
            </p>
          )}
          {state === "error" && <p className={`text-sm py-6 ${c.sub}`}>Impossible de charger le détail. Réessayez.</p>}
          {state === "ready" && data && (
            data.rows.length === 0
              ? <p className={`text-sm py-6 text-center ${c.faint}`}>{data.empty || "Rien à afficher."}</p>
              : <ul className={`divide-y ${c.border}`}>
                  {data.rows.map((row) => (
                    <Row key={row.id} row={row} avatar={!!data.avatar}
                      label={(row.code && questions?.get(row.code)) || row.label} />
                  ))}
                </ul>
          )}
        </div>

        {(data?.truncated || tab) && (
          <div className={`flex items-center gap-3 flex-wrap px-5 py-3 border-t ${c.border} shrink-0`}>
            {data?.truncated && (
              <p className={`text-[11px] ${c.faint}`}>
                {data.rows.length} sur {data.total} affichés — les plus récents.
              </p>
            )}
            {tab && (
              <Btn small variant="ghost" className="ml-auto" onClick={() => { onClose(); go(tab); }}>
                {goLabel} <ArrowRight size={14} />
              </Btn>
            )}
          </div>
        )}
      </Card>
    </div>,
    document.body,
  );
}
