import { useState } from "react";
import { Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Pill } from "@/components/common";
import { SEARCH_INDEX } from "@/constants/navigation";

export function SearchOverlay({ close }) {
  const { c, nav, t } = useApp();
  const [q, setQ] = useState("");
  const results = SEARCH_INDEX.filter((s) => s.l.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={close} role="dialog" aria-label={t("Recherche")}>
      <div className={`w-full max-w-xl rounded-3xl border ${c.border} ${c.card} shadow-2xl overflow-hidden rise`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${c.border}`}>
          <Search size={18} className="text-blue-600" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher une leçon, un module, un article…")} className={`flex-1 bg-transparent outline-none text-sm ${c.text} placeholder:opacity-50`} aria-label={t("Rechercher")} />
          <button onClick={close} aria-label={t("Fermer")} className={`p-1.5 rounded-full ${c.hoverSoft} ${c.sub}`}><X size={16} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className={`px-4 py-8 text-sm text-center ${c.faint}`}>{t("Aucun résultat pour")} « {q} ». {t("Essayez « grammaire » ou « examen ».")}</p>}
          {results.map((r) => (
            <button key={r.l} onClick={() => { nav(r.r); close(); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${c.hoverSoft}`}>
              <span className={`text-sm ${c.text}`}>{t(r.l)}</span><Pill tone="slate">{t(r.c)}</Pill>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
