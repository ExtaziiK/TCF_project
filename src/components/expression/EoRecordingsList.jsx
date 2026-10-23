import { useCallback, useEffect, useState } from "react";
import { Headphones, Play, Trash2, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { fmt } from "@/utils/format";
import { listEoRecordings, eoRecordingUrl, deleteEoRecording, KEEP_RECORDINGS, EO_RECORDINGS_CHANGED } from "@/services/eoRecordingsService";

// « Mes enregistrements »: every saved Expression orale tâche, newest first,
// to listen to yourself again (eoRecordingsService). Shown under the
// practice studio. Renders nothing when the list can't be read (e.g. the
// table doesn't exist yet), so a missing migration never breaks the page.
export function EoRecordingsList() {
  const { c, t } = useApp();
  const [items, setItems] = useState(null); // null: loading; [] or rows
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listEoRecordings()
      .then((rows) => { setItems(rows); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(EO_RECORDINGS_CHANGED, load);
    return () => window.removeEventListener(EO_RECORDINGS_CHANGED, load);
  }, [load]);

  if (failed || items === null) return null;

  return (
    <Card className="mt-8 p-6">
      <h3 className={`font-display font-bold text-lg flex items-center gap-2 ${c.text}`}>
        <Headphones size={18} className="text-blue-600" /> {t("Mes enregistrements")}
      </h3>
      <p className={`mt-1 text-sm ${c.sub}`}>
        {t("Chaque tâche terminée est enregistrée en entier, votre voix et celle de l'examinatrice. Réécoutez-vous pour repérer vos hésitations et progresser.")}{" "}
        <span className={c.faint}>{`${t("Les")} ${KEEP_RECORDINGS} ${t("plus récents sont conservés.")}`}</span>
      </p>
      {items.length === 0 ? (
        <p className={`mt-5 text-sm ${c.faint}`}>{t("Aucun enregistrement pour l'instant. Terminez une tâche pour l'entendre ici.")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((r) => <RecordingRow key={r.id} rec={r} />)}
        </ul>
      )}
    </Card>
  );
}

function RecordingRow({ rec }) {
  const { c, t, notify } = useApp();
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  const play = async () => {
    setBusy(true);
    try { setUrl(await eoRecordingUrl(rec.storage_path)); }
    catch { notify?.(t("Impossible de charger cet enregistrement. Réessayez.")); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    try { await deleteEoRecording(rec); }
    catch { notify?.(t("La suppression a échoué. Réessayez.")); setBusy(false); }
  };

  const date = new Date(rec.created_at).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return (
    <li className={`p-4 rounded-2xl border ${c.border}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${c.text}`}>{t(rec.task_label || `Tâche ${rec.task}`)}</p>
          <p className={`text-xs mt-0.5 ${c.faint}`}>
            {date}
            {Number.isFinite(rec.duration_secs) ? ` · ${fmt(rec.duration_secs)}` : ""}
          </p>
          {rec.prompt && <p className={`text-xs mt-1.5 line-clamp-2 ${c.sub}`}>{rec.prompt}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {rec.mode === "exam" && <Pill tone="slate">{t("TCF blanc")}</Pill>}
          {Number.isFinite(rec.score) && <Pill tone="blue">{rec.score} / 20</Pill>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {url ? (
          <audio controls autoPlay src={url} className="w-full sm:flex-1" />
        ) : (
          <button type="button" onClick={play} disabled={busy} className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {t("Écouter")}
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={`px-3 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 ${armed ? "border-rose-600 text-rose-600 bg-rose-600/10" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}
        >
          <Trash2 size={13} /> {armed ? t("Confirmer la suppression") : t("Supprimer")}
        </button>
      </div>
    </li>
  );
}
