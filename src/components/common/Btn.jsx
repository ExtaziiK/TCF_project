import { useApp } from "@/context/AppContext";

export function Btn({ children, onClick, variant = "primary", className = "", icon: Icon, small, disabled, type = "button", style }) {
  const { c, dark } = useApp();
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${small ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm md:text-base"} disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60`;
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/45 hover:-translate-y-0.5",
    accent: "text-white hover:opacity-95 shadow-lg shadow-rose-600/25 hover:shadow-xl hover:shadow-rose-600/45 hover:-translate-y-0.5",
    // Ghost and soft carry their own fill: the light page canvas (#EDF1F7) is
    // close to a bare border or a faint tint, so without one they vanished.
    ghost: `${c.text} ${c.card} border ${dark ? "border-slate-700" : "border-slate-300"} ${c.hoverSoft} hover:shadow-md hover:-translate-y-0.5`,
    soft: "bg-blue-600/15 text-blue-700 hover:bg-blue-600/25",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={variant === "accent" ? { background: "linear-gradient(90deg,#2E6BE6,#D8354A)", ...style } : style} className={`${base} ${styles[variant]} ${className}`}>
      {children}{Icon && <Icon size={18} aria-hidden="true" />}
    </button>
  );
}
