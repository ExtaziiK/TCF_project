import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function GrammarExercise({ q }) {
  const { c } = useApp();
  const [sel, setSel] = useState(null);
  return (
    <div className={`p-5 rounded-2xl border ${c.border}`}>
      <p className={`font-medium text-sm ${c.text}`}>{q.q}</p>
      <div className="mt-3 flex gap-2 flex-wrap">
        {q.opts.map((o, i) => {
          const st = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
          return (
            <button key={o} disabled={sel !== null} onClick={() => setSel(i)} className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all
              ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
              ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
              ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
              ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>{o}</button>
          );
        })}
      </div>
      {sel !== null && <p className={`mt-3 text-sm rise ${sel === q.a ? "text-emerald-600" : "text-rose-600"}`}>{sel === q.a ? "Bonne réponse ! " : "Pas tout à fait. "}<span className={c.sub}>{q.exp}</span></p>}
    </div>
  );
}
