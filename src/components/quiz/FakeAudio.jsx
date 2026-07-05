import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";
import { fmt } from "@/utils/format";

export function FakeAudio() {
  const { c } = useApp();
  const DUR = 32;
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setT((x) => { if (x >= DUR) { setPlaying(false); return DUR; } return x + 1; }), 1000);
    return () => clearInterval(iv);
  }, [playing]);
  return (
    <Card className="p-5 flex items-center gap-4">
      <button onClick={() => { if (t >= DUR) setT(0); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Écouter"} className="w-12 h-12 rounded-full grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform shrink-0">
        {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex justify-between text-xs font-mono2 mb-1.5">
          <span className="text-blue-600 font-semibold">Document audio · écoute unique le jour J</span>
          <span className={c.faint}>{fmt(t)} / {fmt(DUR)}</span>
        </div>
        <div className={`h-2 rounded-full ${c.track} overflow-hidden`} role="progressbar" aria-valuenow={t} aria-valuemax={DUR}>
          <div className="h-full grad-brand rounded-full transition-all" style={{ width: `${(t / DUR) * 100}%` }} />
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
