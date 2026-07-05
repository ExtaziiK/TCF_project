import { CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rise" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-slate-900 text-white text-sm font-medium shadow-2xl border border-slate-700 max-w-[92vw]">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />{toast}
      </div>
    </div>
  );
}
