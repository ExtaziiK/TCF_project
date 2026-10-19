import { useApp } from "@/context/AppContext";

// Pill-shaped segmented control (Révision, Anciens sujets). The selected
// segment takes the tool colour of the PageShell panel it sits in
// (--tool-fill), so it matches the page. `Icon` per item is optional.
export function Segmented({ items, value, onChange, label }) {
  const { c, t } = useApp();
  return (
    <div className={`inline-flex flex-wrap p-1 rounded-full border ${c.border} ${c.card}`} role="group" aria-label={label}>
      {items.map(({ id, label: l, Icon }) => {
        const on = value === id;
        return (
          <button type="button" key={id} onClick={() => onChange(id)} aria-pressed={on}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${on ? "bg-[var(--tool-fill,#2563EB)] text-white" : `${c.sub} ${c.hoverSoft}`}`}>
            {Icon && <Icon size={14} aria-hidden="true" />} {t(String(l))}
          </button>
        );
      })}
    </div>
  );
}
