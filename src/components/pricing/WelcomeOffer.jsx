import { useEffect, useState } from "react";
import { Gift, Timer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { promoLabel } from "@/services/stripeService";
import { formatCountdown } from "@/utils/welcomeOffer";

// The banner above the plan cards for a new account: what has already been
// applied for them, on which plans, and how long is left.
//
// The countdown is the whole point of it. A discount with no visible deadline
// reads as the normal price, and a deadline the page does not keep reads as a
// lie — so when this reaches zero it does not merely stop the clock, it tells
// the pricing hook to drop the code, and the cards go back to full price in
// the same tick.
export function WelcomeOffer({ welcome, promo, onExpire }) {
  const { c, t, dark } = useApp();
  const [left, setLeft] = useState(() => welcome.endsAt - Date.now());

  // Recomputed from the deadline rather than decremented, so a throttled
  // background tab or a sleeping laptop comes back to the right figure instead
  // of to however many ticks it managed to fire.
  useEffect(() => {
    setLeft(welcome.endsAt - Date.now());
    const id = setInterval(() => setLeft(welcome.endsAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [welcome.endsAt]);

  const expired = left <= 0;
  useEffect(() => { if (expired) onExpire(); }, [expired, onExpire]);
  if (expired) return null;

  return (
    <div className="flex justify-center mb-8">
      <div
        className={`rise w-full max-w-3xl rounded-3xl border px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 ${dark ? "bg-rose-500/10 border-rose-400/40" : "bg-rose-50 border-rose-200"}`}
      >
        <span
          className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow"
          style={{ background: "linear-gradient(135deg,#D8354A,#ef6f7e)" }}
          aria-hidden="true"
        >
          <Gift size={20} />
        </span>

        <div className="flex-1 min-w-0">
          <p className={`font-display font-extrabold text-base sm:text-lg leading-tight ${c.text}`}>
            {t("Offre de bienvenue :")}{" "}
            <span className="text-rose-600">{promoLabel(promo)}</span>{" "}
            {t("sur tous nos forfaits")}
          </p>
          <p className={`mt-1 text-sm ${c.sub}`}>
            {t("Votre code")}{" "}
            <strong className={`font-mono2 font-bold ${c.text}`}>{welcome.code}</strong>{" "}
            {t("est déjà appliqué — rien à saisir. Il expire 24 h après votre inscription.")}
          </p>
        </div>

        {/* The clock ticks once a second, which is worth nothing to a screen
            reader and actively hostile if announced: the sentence above
            already carries the deadline, so the digits are decoration and the
            label beside them is the fact. */}
        <div
          className={`shrink-0 flex sm:flex-col items-center gap-2 sm:gap-0.5 px-4 py-2 rounded-2xl ${dark ? "bg-slate-950/40" : "bg-white"}`}
          aria-hidden="true"
        >
          <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${c.faint}`}>
            <Timer size={13} /> {t("Il reste")}
          </span>
          <span className="font-mono2 font-extrabold text-xl tabular-nums text-rose-600">{formatCountdown(left)}</span>
        </div>
      </div>
    </div>
  );
}
