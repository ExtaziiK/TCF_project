import { useApp } from "@/context/AppContext";
import { ProgressBar } from "@/components/common";

// Progress of a manual send from Administration → Emails (welcome catch-up,
// -50 % offer). The server sends in batches of 10, so the bar moves once per
// batch; `done` counts sent + failed, against the number pending at the start.
export function SendProgress({ progress }) {
  const { c } = useApp();
  if (!progress) return null;
  const { done, total, sent, failed, finished } = progress;
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 100;
  return (
    <div className="w-full mt-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 mb-1.5 text-xs">
        <span className={`font-semibold ${c.text}`}>
          {finished ? "Terminé" : "Envoi en cours…"} · {sent} / {total} envoyé(s)
          {failed > 0 && <span className="text-rose-600"> · {failed} échec(s)</span>}
        </span>
        <span className={c.faint}>{finished ? `${pct} %` : `${pct} % — ne fermez pas la page`}</span>
      </div>
      <ProgressBar pct={pct} tone={finished ? "blue" : "grad"} />
    </div>
  );
}
