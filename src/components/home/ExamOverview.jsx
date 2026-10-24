import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common";
import { MOCK_SECTIONS } from "@/constants/mocks";
import { WHY } from "@/constants/home";
import { PALETTE } from "./toolsData";

// The landing page's "L'épreuve en bref" section: the exam at a glance (four
// key figures beside the title), the four épreuves as cards in the tools
// showcase's colours — CO blue, CE red, EE violet, EO amber, as on the TCF
// blanc boarding pass — each with its size, a bar for its share of the
// timing and a link to the épreuve, then "Pourquoi nous choisir" as a row of
// four tiles. Flat colours, like the rest of the page.

const TONES = ["blue", "rose", "violet", "amber"];
const LONGEST = 60; // minutes — the longest épreuve, the duration bars' full width
const FACTS = [["4", "épreuves"], ["2 h 47", "au total"], ["699", "points maximum"], ["NCLC", "niveaux reconnus par IRCC"]];

// "39 questions · 35 min" → { count: "39", unit: "questions", min: 35 }
function split(d) {
  const m = /^(\d+)\s+(\S+)\s+·\s+(\d+)\s*min/.exec(d) || [];
  return { count: m[1] || "", unit: m[2] || "", min: Number(m[3]) || 0 };
}

export function ExamOverview() {
  const { c, t, dark } = useApp();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("L'épreuve en bref")}</p>
          <h2 className={`mt-3 font-display font-extrabold text-3xl md:text-5xl leading-tight ${c.text}`}>{t("Comprendre le TCF Canada")}</h2>
          <p className={`mt-4 text-base md:text-lg leading-relaxed ${c.sub}`}>
            {t("Un test unique, quatre épreuves obligatoires, un score sur 699 points converti en niveaux NCLC pour votre dossier IRCC.")}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {FACTS.map(([value, label]) => (
            <div key={label} className={`rounded-2xl border-2 px-4 py-3 ${c.border} ${c.card}`}>
              <dt className={`text-xs ${c.sub}`}>{t(label)}</dt>
              <dd className="font-display font-extrabold text-2xl grad-text">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_SECTIONS.map((s, i) => {
          const [bg, ink, soft] = PALETTE[TONES[i]][dark ? "dark" : "light"];
          const { count, unit, min } = split(s.d);
          return (
            <RouteLink key={s.t} r={s.route}
              className="group flex flex-col rounded-3xl border-2 p-5 transition hover:-translate-y-1"
              style={{ background: bg, borderColor: `${ink}55` }}>
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-11 h-11 rounded-2xl text-white" style={{ background: ink }}><s.icon size={20} /></span>
                <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>0{i + 1}</span>
              </div>
              <h3 className={`mt-4 font-display font-extrabold text-lg ${c.text}`}>{t(s.t)}</h3>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-4xl" style={{ color: ink }}>{count}</span>
                <span className={`text-sm font-semibold ${c.sub}`}>{t(unit)}</span>
              </p>
              {/* The épreuve's length, against the longest one. */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: soft }}>
                  <div className="h-full rounded-full" style={{ width: `${(min / LONGEST) * 100}%`, background: ink }} />
                </div>
                <span className="font-mono2 text-xs font-bold" style={{ color: ink }}>{min} min</span>
              </div>
              <p className={`mt-4 text-sm leading-relaxed flex-1 ${c.sub}`}>{t(s.desc)}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5" style={{ color: ink }}>
                {t("S'entraîner")} <ArrowRight size={15} />
              </span>
            </RouteLink>
          );
        })}
      </div>

      <h3 className={`mt-14 font-display font-bold text-2xl ${c.text}`}>{t("Pourquoi nous choisir")}</h3>
      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WHY.map((w) => (
          <div key={w.t} className={`rounded-3xl border p-5 ${c.border} ${c.card}`}>
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600"><w.icon size={18} /></span>
            <p className={`mt-4 font-display font-bold ${c.text}`}>{t(w.t)}</p>
            <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t(w.d)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
