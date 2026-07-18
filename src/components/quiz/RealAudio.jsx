import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, VolumeX, Headphones, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";
import { fmt } from "@/utils/format";

// How long to wait for a signed URL before giving up and showing the "couldn't
// load" state — long enough for a slow media round-trip, short enough that a
// failed sign call doesn't spin forever.
const SRC_TIMEOUT_MS = 20000;

// Styled audio player for real files — same design as FakeAudio (gradient
// play button, brand progress bar, equalizer) but driven by an <audio>
// element. The bar is clickable to seek.
// `allowReplay` (default true): in test mode it's false, reproducing real exam
// conditions — the clip plays once, can't be rewound and can't be replayed.
// `autoPlay`: start playback automatically (CO test mode). `onEnded`: notified
// when the clip finishes OR fails to load, so the runner can auto-advance.
// `src` may be null on first render while its signed URL is still being fetched:
// the player shell appears immediately in a loading state and the <audio> only
// mounts (and loads in the background) once the URL arrives — no late pop-in.
export function RealAudio({ src, allowReplay = true, autoPlay = false, onEnded }) {
  const { c } = useApp();
  const audioRef = useRef(null);
  const barRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const loading = !src && !failed; // waiting for the signed URL

  useEffect(() => { setPlaying(false); setT(0); setDur(0); setEnded(false); setFailed(false); }, [src]);

  // Don't spin forever if the signed URL never arrives (sign call failed): fall
  // back to the same "couldn't load" state a real load error would produce.
  useEffect(() => {
    if (src) return;
    const id = setTimeout(() => setFailed(true), SRC_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [src]);

  // Auto-play the new clip (browsers allow it after the user's "Commencer"
  // gesture; if blocked, the play button remains and playback stays manual).
  useEffect(() => {
    if (!autoPlay || !audioRef.current) return;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
  }, [src, autoPlay]);

  const spent = ended && !allowReplay; // played once already, no second listen

  const toggle = () => {
    const a = audioRef.current;
    if (!a || spent) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { if (ended) { a.currentTime = 0; setEnded(false); } a.play().catch(() => setFailed(true)); setPlaying(true); }
  };

  const seek = (e) => {
    const a = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar || !dur || !allowReplay) return; // no scrubbing in test mode
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
      {/* Only mount the element once its URL is known, so it starts loading in
          the background the moment the signed URL lands. */}
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onEnded={() => { setPlaying(false); setEnded(true); onEnded?.(); }}
          onError={() => { setFailed(true); setPlaying(false); onEnded?.(); }}
        />
      )}
      {loading ? (
        // Player shell shown instantly while the signed URL is fetched.
        <span className="w-12 h-12 rounded-full grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 opacity-80" aria-label="Chargement du document audio">
          <Loader2 size={20} className="animate-spin" />
        </span>
      ) : autoPlay ? (
        // Test mode: the clip plays by itself — no play/pause/replay control.
        <span className="w-12 h-12 rounded-full grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0" aria-hidden="true">
          <Headphones size={20} />
        </span>
      ) : (
        <button onClick={toggle} disabled={spent} aria-label={spent ? "Écoute terminée" : playing ? "Pause" : ended ? "Réécouter" : "Écouter"} className={`w-12 h-12 rounded-full grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform shrink-0 ${spent ? "opacity-40 cursor-not-allowed" : "hover:scale-105"}`}>
          {spent ? <VolumeX size={18} /> : playing ? <Pause size={20} /> : ended ? <RotateCcw size={18} /> : <Play size={20} className="ml-0.5" />}
        </button>
      )}
      <div className="flex-1">
        <div className="flex justify-between text-xs font-mono2 mb-1.5">
          <span className="text-blue-600 font-semibold">{loading ? "Document audio · chargement…" : spent ? "Document audio · écoute terminée" : "Document audio · écoute unique le jour J"}</span>
          <span className={c.faint}>{loading ? "–:––" : fmt(Math.floor(t))} / {!loading && dur ? fmt(Math.round(dur)) : "–:––"}</span>
        </div>
        <div ref={barRef} onClick={seek} role="progressbar" aria-valuenow={Math.floor(t)} aria-valuemax={Math.round(dur)} aria-label="Position de lecture" className={`h-2 rounded-full ${c.track} overflow-hidden ${allowReplay && !loading ? "cursor-pointer" : "cursor-default"}`}>
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
