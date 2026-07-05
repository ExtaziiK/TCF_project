import { useApp } from "@/context/AppContext";

export function Card({ children, className = "", lift }) {
  const { c } = useApp();
  return <div className={`rounded-3xl border ${c.border} ${c.card} ${lift ? "card-lift" : ""} ${className}`}>{children}</div>;
}
