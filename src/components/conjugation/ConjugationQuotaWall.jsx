import { Crown, Timer, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { fmt } from "@/utils/format";

// What replaces the practice column once a free account has spent its ten
// minutes. Deliberately NOT a route-level gate: the lessons beside it stay on
// screen and stay free, so the candidate is looking at the rules, the tables
// and the irregulars they still have while they read the offer. A full-page
// lock would hide the very thing being sold.
export function ConjugationQuotaWall({ resetAt }) {
  const { c, t, nav, lang } = useApp();
  const perks = [
    "Conjugaison sans limite de temps, tous les temps, tous les jours",
    "La dictée, les TCF blancs complets et l'analyse IA",
    "Les quatre épreuves au format officiel",
  ];
  const resetLabel = resetAt.toLocaleTimeString(lang === "en" ? "en-CA" : "fr-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="p-8 text-center border-2 border-blue-600/40 rise">
      <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
        <Crown size={22} aria-hidden="true" />
      </span>
      <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t("Vos 10 minutes du jour sont écoulées")}</p>
      <p className={`text-sm mt-1.5 ${c.sub}`}>
        {t("La leçon reste ouverte à côté — révisez les règles et les tableaux autant que vous voulez.")}
      </p>

      <ul className="mt-6 space-y-2.5 text-left max-w-sm mx-auto">
        {perks.map((p) => (
          <li key={p} className={`flex items-start gap-2.5 text-sm ${c.sub}`}>
            <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />{t(p)}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
        <Btn variant="accent" onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
        <Btn variant="ghost" onClick={() => nav("grammar")}>{t("Aller à la grammaire")}</Btn>
      </div>

      <p className={`mt-5 text-xs ${c.faint}`}>
        {t("Vos 10 minutes reviennent à")} {resetLabel}.
      </p>
    </Card>
  );
}

// The countdown above the practice column. Shown only to metered accounts, and
// only once today's total is known.
export function QuotaMeter({ left, limit }) {
  const { c, t } = useApp();
  const low = left <= limit * 0.2;
  return (
    <span
      role="timer"
      aria-label={`${t("Temps de pratique restant aujourd'hui")} ${fmt(left)}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono2 font-semibold text-xs ${low ? "bg-rose-600/10 text-rose-600" : `${c.hoverSoft} ${c.sub}`}`}
    >
      <Timer size={13} aria-hidden="true" />{fmt(left)} {t("restantes")}
    </span>
  );
}
