import { useApp } from "@/context/AppContext";

export function ProgressBar({ pct, tone = "blue" }) {
  const { c } = useApp();
  return (
    <div className={`h-2 rounded-full ${c.track} overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-700 ${tone === "grad" ? "grad-brand" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
