import { useEffect, useState } from "react";
import { Flame, ArrowRight, Sparkles } from "lucide-react";
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

// Sparkles scattered over the banner, each on its own beat (see .sale-twinkle).
const TWINKLES = [
  { top: "12%", left: "8%", size: 16, delay: "0s" },
  { top: "68%", left: "30%", size: 13, delay: ".7s" },
  { top: "18%", left: "56%", size: 18, delay: "1.3s" },
  { top: "72%", left: "78%", size: 15, delay: ".4s" },
  { top: "10%", left: "92%", size: 13, delay: "1.8s" },
];

function Twinkles() {
  return TWINKLES.map((x, i) => (
    <Sparkles key={i} size={x.size} className="sale-twinkle" style={{ top: x.top, left: x.left, animationDelay: x.delay }} aria-hidden="true" />
  ));
}

// Each digit is keyed on its value, so a change remounts it and replays the
// drop-in (.sale-tick); the unchanged ones stay still.
function Clock({ left, small }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {parts(left).map(([n, unit]) => (
        <span key={unit} className={`flex flex-col items-center overflow-hidden rounded-xl bg-white/95 text-rose-700 shadow-md ${small ? "min-w-[2.6rem] px-1.5 py-1" : "min-w-[3.4rem] px-2 py-1.5"}`}>
          <span key={n} className={`sale-tick font-mono2 font-extrabold tabular-nums leading-none ${small ? "text-base" : "text-2xl"}`}>{String(n).padStart(2, "0")}</span>
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
      <div className="sale-bg rise relative w-full max-w-4xl rounded-3xl px-5 sm:px-7 py-5 sm:py-6 text-white flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <span className="sale-sweep" aria-hidden="true" />
        <Twinkles />
        <span className="relative shrink-0 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center" aria-hidden="true"><Flame size={24} className="sale-flame" /></span>
        <div className="relative flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">{t("Promo")}</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl leading-tight mt-0.5"><span className="sale-pop">−{SALE.percentOff} %</span> {t("sur tous les forfaits")}</p>
          <p className="text-sm text-white/90 mt-1">{t("Déjà appliquée : rien à saisir. Offre limitée dans le temps.")}</p>
        </div>
        <div className="relative shrink-0">
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
      className="sale-bg rise group relative mx-auto mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl px-4 sm:px-5 py-3 text-white text-left max-w-full transition-transform hover:scale-[1.02]">
      <span className="sale-sweep" aria-hidden="true" />
      <Twinkles />
      <span className="relative flex items-center gap-2 font-display font-extrabold text-base sm:text-lg">
        <Flame size={18} className="sale-flame" aria-hidden="true" /> {t("Promo")} : <span className="sale-pop">−{SALE.percentOff} %</span> {t("sur tous les forfaits")}
      </span>
      <span className="relative"><Clock left={left} small /></span>
      <span className="relative flex items-center gap-1 text-sm font-bold underline-offset-2 group-hover:underline">
        {t("Voir les prix")} <ArrowRight size={15} className="sale-nudge" aria-hidden="true" />
      </span>
    </button>
  );
}
