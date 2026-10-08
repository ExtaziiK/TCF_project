import { useEffect, useState } from "react";
import { Flame, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SALE, saleActive } from "../../../api/_lib/sale.js";

// The banner of a running sale (api/_lib/sale.js): the discount, that it is
// already applied, and a countdown to the end. Two sizes: the full one above
// the plan cards (Tarifs, landing pricing block) and a slim one in the landing
// hero that leads to Tarifs.
//
// Like WelcomeOffer, the clock is recomputed from the deadline every second
// rather than decremented, so a sleeping laptop wakes up to the right figure;
// at zero it calls `onExpire`, which puts the cards back to full price in the
// same tick, and the banner disappears.

// Time left until the sale ends (ms), ticking; 0 once over.
export function useSaleCountdown() {
  const [left, setLeft] = useState(() => (saleActive() ? SALE.endsAt - Date.now() : 0));
  useEffect(() => {
    if (!saleActive()) return;
    const id = setInterval(() => setLeft(Math.max(0, SALE.endsAt - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    [Math.floor(s / 86400), "j"],
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "s"],
  ];
}

const GRAD = "linear-gradient(135deg,#D8354A,#ef6f7e 55%,#f6a04d)";

function Clock({ left, small }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {parts(left).map(([n, unit]) => (
        <span key={unit} className={`flex flex-col items-center rounded-xl bg-white/95 text-rose-700 shadow-sm ${small ? "min-w-[2.6rem] px-1.5 py-1" : "min-w-[3.4rem] px-2 py-1.5"}`}>
          <span className={`font-mono2 font-extrabold tabular-nums leading-none ${small ? "text-base" : "text-2xl"}`}>{String(n).padStart(2, "0")}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-0.5">{unit}</span>
        </span>
      ))}
    </div>
  );
}

export function SaleBanner({ onExpire }) {
  const { t } = useApp();
  const left = useSaleCountdown();
  const over = left <= 0;
  useEffect(() => { if (over) onExpire?.(); }, [over, onExpire]);
  if (over) return null;
  return (
    <div className="flex justify-center mb-8">
      <div className="rise w-full max-w-4xl rounded-3xl px-5 sm:px-7 py-5 sm:py-6 text-white shadow-xl shadow-rose-600/25 flex flex-col md:flex-row md:items-center gap-4 md:gap-6" style={{ background: GRAD }}>
        <span className="shrink-0 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center" aria-hidden="true"><Flame size={24} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">{t(SALE.name)}</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl leading-tight mt-0.5">−{SALE.percentOff} % {t("sur tous les forfaits")}</p>
          <p className="text-sm text-white/90 mt-1">{t("Déjà appliquée : rien à saisir. Offre limitée dans le temps.")}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/85 mb-1.5">{t("Se termine dans")}</p>
          <Clock left={left} />
        </div>
      </div>
    </div>
  );
}

// Slim version for the landing hero, linking to the plans.
export function SaleStrip() {
  const { t, nav } = useApp();
  const left = useSaleCountdown();
  if (left <= 0) return null;
  return (
    <button type="button" onClick={() => nav("pricing")}
      className="rise group mx-auto mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl px-4 sm:px-5 py-3 text-white text-left shadow-lg shadow-rose-600/25 max-w-full"
      style={{ background: GRAD }}>
      <span className="flex items-center gap-2 font-display font-extrabold text-base sm:text-lg">
        <Flame size={18} aria-hidden="true" /> {t(SALE.name)} : −{SALE.percentOff} % {t("sur tous les forfaits")}
      </span>
      <Clock left={left} small />
      <span className="flex items-center gap-1 text-sm font-bold underline-offset-2 group-hover:underline">
        {t("Voir les prix")} <ArrowRight size={15} aria-hidden="true" />
      </span>
    </button>
  );
}
