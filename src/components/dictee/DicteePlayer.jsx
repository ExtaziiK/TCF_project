import { Play, Pause, Gauge } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Pill } from "@/components/common";
import { SPEEDS } from "@/hooks/useDictee";
import { segmentMode } from "@/utils/dicteeSegments";

// The listening half of a dictée: one button that replays the current passage,
// and the speed control.
//
// Replays are UNLIMITED but counted. Capping them would only push someone to
// restart the whole dictée to hear a passage again, and the count is worth
// more as feedback than as a rule: ninety per cent at one listen per passage
// and ninety per cent at four are different results, and the report says so.

export function DicteePlayer({ index, total, plays, playing, speed, setSpeed, onPlay, mode }) {
  const { c, t } = useApp();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onPlay}
        aria-label={playing ? t("Lecture en cours") : t("Écouter le passage")}
        className="w-14 h-14 rounded-2xl grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 transition-transform shrink-0"
      >
        {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
      </button>

      <div className="min-w-0">
        <p className={`font-semibold text-sm ${c.text}`}>
          {t("Passage")} {index + 1} <span className={c.faint}>/ {total}</span>
        </p>
        <p className={`text-xs ${c.sub}`}>
          {plays === 0 ? t("Cliquez pour écouter") : `${plays} ${plays > 1 ? t("écoutes") : t("écoute")}`}
          {mode && <span className={c.faint}> · {t(segmentMode(mode).label)}</span>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 ml-auto" role="group" aria-label={t("Vitesse de lecture")}>
        <Gauge size={15} className={c.faint} aria-hidden="true" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono2 transition-colors ${
              speed === s ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {speed !== 1 && (
        <Pill tone="amber" className="w-full sm:w-auto">
          {t("Vitesse modifiée — l'examen se déroule à vitesse normale")}
        </Pill>
      )}
    </div>
  );
}
