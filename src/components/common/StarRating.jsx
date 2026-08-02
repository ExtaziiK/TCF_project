import { Star } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STARS = [1, 2, 3, 4, 5];

// Star rating, readable and settable.
//
// Without `onChange` it renders as plain text-equivalent output (an image role
// carrying the score), which is what the avis page and the landing cards want.
// With it, each star is a real radio input: arrow keys move between them and a
// screen reader announces "3 sur 5" rather than five unlabelled buttons.
export function StarRating({ value = 0, onChange, size = 18, name = "rating" }) {
  const { c, t } = useApp();
  const readOnly = !onChange;

  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} ${t("sur")} 5`}>
        {STARS.map((n) => (
          <Star
            key={n}
            size={size}
            className={n <= value ? "text-amber-500" : c.faint}
            fill={n <= value ? "currentColor" : "none"}
            aria-hidden="true"
          />
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={t("Votre note")} className="inline-flex items-center gap-1">
      {STARS.map((n) => (
        <label key={n} className="cursor-pointer p-0.5">
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="sr-only peer"
          />
          <Star
            size={size}
            className={`transition-transform hover:scale-110 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60 rounded ${n <= value ? "text-amber-500" : c.faint}`}
            fill={n <= value ? "currentColor" : "none"}
            aria-hidden="true"
          />
          <span className="sr-only">{`${n} ${t("sur")} 5`}</span>
        </label>
      ))}
    </div>
  );
}
