import { useApp } from "@/context/AppContext";

export function Btn({ children, onClick, variant = "primary", className = "", icon: Icon, small, disabled, type = "button" }) {
  const { c } = useApp();
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${small ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm md:text-base"} disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60`;
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5",
    accent: "text-white hover:opacity-90 shadow-lg hover:-translate-y-0.5",
    ghost: `${c.text} border ${c.border} ${c.hoverSoft}`,
    soft: "bg-blue-600/10 text-blue-600 hover:bg-blue-600/20",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={variant === "accent" ? { background: "linear-gradient(90deg,#2E6BE6,#D8354A)" } : undefined} className={`${base} ${styles[variant]} ${className}`}>
      {children}{Icon && <Icon size={18} aria-hidden="true" />}
    </button>
  );
}
