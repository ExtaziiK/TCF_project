import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  // A failure must not wear the success check — every message used to render
  // the same green tick, so a refused action looked like a completed one.
  // Tone comes from notify(message, tone) — see hooks/useToast.js.
  const error = toast.tone === "error";
  const Icon = error ? AlertTriangle : CheckCircle2;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rise" role="status" aria-live={error ? "assertive" : "polite"}>
      <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-full text-white text-sm font-medium shadow-2xl border max-w-[92vw]
        ${error ? "bg-rose-950 border-rose-800" : "bg-slate-900 border-slate-700"}`}>
        <Icon size={16} className={`shrink-0 ${error ? "text-rose-400" : "text-emerald-400"}`} />{toast.text}
      </div>
    </div>
  );
}
