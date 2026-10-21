import { useApp } from "@/context/AppContext";

// The numbered "what to do" line on the hero demo cards. A single grey
// sentence ("Écoutez…, puis choisissez…") did not read as an invitation: the
// cards looked like a screenshot, not something to click. Numbered steps in the
// card's own accent say both that it is interactive and in which order; once an
// answer is picked they turn into ticks.
export function DemoSteps({ steps, done, tone = "blue" }) {
  const { c, t } = useApp();
  const accent = tone === "red" ? "bg-rose-600" : "bg-blue-600";
  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
      {steps.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 text-sm font-semibold ${done ? c.sub : c.text}`}>
          <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 ${done ? "bg-emerald-500" : accent}`}>
            {done ? "✓" : i + 1}
          </span>
          {t(label)}
        </li>
      ))}
    </ol>
  );
}
