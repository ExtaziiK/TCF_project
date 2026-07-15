import { useApp } from "@/context/AppContext";

export function DiffPicker({ value, onChange }) {
  const { c, t } = useApp();
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <span className={`text-sm font-semibold ${c.sub}`}>{t("Difficulté :")}</span>
      {["Mixte", "A2", "B1", "B2", "C1"].map((d) => (
        <button key={d} onClick={() => onChange(d)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${value === d ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`} aria-pressed={value === d}>{t(d)}</button>
      ))}
    </div>
  );
}
