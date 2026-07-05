import { useState } from "react";
import { Headphones, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";
import { LISTEN_QS } from "@/constants/listening";

export function DemoQuestion() {
  const { c } = useApp();
  const [sel, setSel] = useState(null);
  const q = LISTEN_QS[0];
  return (
    <Card className="p-6 md:p-7 shadow-2xl shadow-blue-600/10 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl" aria-hidden="true" />
      <div className="flex items-center justify-between mb-4 relative">
        <Pill tone="blue"><Headphones size={12} /> Question du jour · CO</Pill>
        <Pill tone="slate">Niveau {q.level}</Pill>
      </div>
      <p className={`text-sm leading-relaxed mb-5 ${c.text}`}>{q.q}</p>
      <div className="space-y-2.5">
        {q.opts.map((o, i) => {
          const state = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
          return (
            <button key={o} disabled={sel !== null} onClick={() => setSel(i)}
              className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-2
              ${state === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
              ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
              ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
              ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
              {o}
              {state === "right" && <CheckCircle2 size={17} />}
              {state === "wrong" && <XCircle size={17} />}
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <div className="mt-4 p-4 rounded-2xl bg-blue-600/10 text-sm rise">
          <p className="font-semibold text-blue-600 flex items-center gap-1.5 mb-1"><Lightbulb size={14} /> Explication</p>
          <p className={c.sub}>{q.exp}</p>
        </div>
      )}
    </Card>
  );
}
