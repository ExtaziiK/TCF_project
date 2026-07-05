import { Timer } from "lucide-react";
import { fmt } from "@/utils/format";

export function TimerChip({ left, total }) {
  const low = left < total * 0.2;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono2 font-semibold text-sm ${low ? "bg-rose-600/10 text-rose-600" : "bg-blue-600/10 text-blue-600"}`} role="timer" aria-label={`Temps restant ${fmt(left)}`}>
      <Timer size={14} />{fmt(left)}
    </span>
  );
}
