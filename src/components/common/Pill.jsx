export function Pill({ children, tone = "blue", className = "" }) {
  const tones = {
    blue: "bg-blue-600/10 text-blue-600",
    red: "bg-rose-600/10 text-rose-600",
    green: "bg-emerald-600/10 text-emerald-600",
    amber: "bg-amber-500/15 text-amber-600",
    slate: "bg-slate-500/10 text-slate-500",
  };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${tones[tone]} ${className}`}>{children}</span>;
}
