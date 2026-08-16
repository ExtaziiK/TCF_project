import { useApp } from "@/context/AppContext";
import { PRONOUN_LABELS } from "@/constants/conjugation";

// A model verb, fully conjugated. `labels` defaults to the six persons; a
// tense with a different paradigm supplies its own (l'impératif has three).
export function ConjugationTable({ table }) {
  const { c } = useApp();
  const labels = table.labels || PRONOUN_LABELS;
  return (
    <div className={`rounded-2xl border overflow-hidden ${c.border}`}>
      <div className={`flex items-baseline justify-between gap-2 px-4 py-2.5 border-b ${c.border} ${c.hoverSoft}`}>
        <span className={`font-display font-bold ${c.text}`}>{table.verb}</span>
        <span className={`text-xs font-mono2 ${c.faint}`}>{table.note}</span>
      </div>
      <ul className={`divide-y ${c.border}`}>
        {table.forms.map((form, i) => (
          <li key={i} className="flex items-baseline gap-3 px-4 py-2">
            <span className={`w-20 shrink-0 text-xs font-mono2 ${c.faint}`}>{labels[i]}</span>
            <span className={`text-sm font-medium ${c.text}`}>{form}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The forms that no rule produces and that simply have to be memorised.
export function IrregularList({ items }) {
  const { c } = useApp();
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.v} className={`flex flex-col sm:flex-row sm:items-baseline gap-x-3 text-sm p-2.5 rounded-xl ${c.hoverSoft}`}>
          <span className={`font-semibold shrink-0 sm:w-40 ${c.text}`}>{it.v}</span>
          <span className={`font-mono2 text-[13px] ${c.sub}`}>{it.f}</span>
        </li>
      ))}
    </ul>
  );
}
