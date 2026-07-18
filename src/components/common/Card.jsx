import { useApp } from "@/context/AppContext";

export function Card({ children, className = "", lift, style }) {
  const { c } = useApp();
  return <div style={style} className={`rounded-3xl border ${c.border} ${c.card} ${lift ? "card-lift" : ""} ${className}`}>{children}</div>;
}
