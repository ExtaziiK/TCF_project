import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, VolumeX } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";
import { fmt } from "@/utils/format";

// Styled audio player for real files — same design as FakeAudio (gradient
// play button, brand progress bar, equalizer) but driven by an <audio>
// element. The bar is clickable to seek.
export function RealAudio({ src }) {
  const { c } = useApp();
  const audioRef = useRef(null);
  const barRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setPlaying(false); setT(0); setDur(0); setEnded(false); setFailed(false); }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { if (ended) { a.currentTime = 0; setEnded(false); } a.play().catch(() => setFailed(true)); setPlaying(true); }
  };

  const seek = (e) => {
    const a = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar || !dur) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * dur;
    setT(ratio * dur);
    setEnded(false);
  };

  if (failed) {
    return (
      <Card className="p-5 flex items-center gap-3">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-600/10 text-rose-600`}><VolumeX size={18} /></span>
        <p className={`text-sm ${c.sub}`}>Le document audio de cette question n'a pas pu être chargé. Vous pouvez répondre à la question ou passer à la suivante.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 flex items-center gap-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setEnded(true); }}
        onError={() => { setFailed(true); setPlaying(false); }}
      />
      <button onClick={toggle} aria-label={playing ? "Pause" : ended ? "Réécouter" : "Écouter"} className="w-12 h-12 rounded-full grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform shrink-0">
        {playing ? <Pause size={20} /> : ended ? <RotateCcw size={18} /> : <Play size={20} className="ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex justify-between text-xs font-mono2 mb-1.5">
          <span className="text-blue-600 font-semibold">Document audio · écoute unique le jour J</span>
          <span className={c.faint}>{fmt(Math.floor(t))} / {dur ? fmt(Math.round(dur)) : "–:––"}</span>
        </div>
        <div ref={barRef} onClick={seek} role="progressbar" aria-valuenow={Math.floor(t)} aria-valuemax={Math.round(dur)} aria-label="Position de lecture" className={`h-2 rounded-full ${c.track} overflow-hidden cursor-pointer`}>
          <div className="h-full grad-brand rounded-full" style={{ width: dur ? `${(t / dur) * 100}%` : 0 }} />
        </div>
      </div>
      <div className="hidden sm:flex items-end gap-1 h-8" aria-hidden="true">
        {[0, 1, 2, 3].map((b) => (
          <span key={b} className={`w-1.5 rounded-full grad-brand ${playing ? "eqbar" : ""}`} style={{ height: "100%", animationDelay: `${b * 0.15}s`, transform: playing ? undefined : "scaleY(.3)", transformOrigin: "bottom" }} />
        ))}
      </div>
    </Card>
  );
}
