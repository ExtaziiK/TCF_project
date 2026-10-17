import { useApp } from "@/context/AppContext";

export function DiffPicker({ value, onChange }) {
  const { c, t } = useApp();
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <span className={`text-sm font-semibold ${c.sub}`}>{t("Difficulté :")}</span>
      {["Mixte", "A2", "B1", "B2", "C1"].map((d) => (
        <button key={d} onClick={() => onChange(d)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${value === d ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`} aria-pressed={value === d}>{t(d)}</button>
      ))}
    </div>
  );
}
