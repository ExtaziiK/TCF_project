import { useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, FileText, MessagesSquare, FolderOpen, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { SUJETS_EE_YEARS } from "@/constants/sujetsEE";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// One task block (Tâche 1 / 2) — an uppercase label with its word-count pill,
// then the verbatim prompt. Exam prompts stay in French, so they are rendered
// raw (not through the i18n dictionary).
function Task({ n, words, children }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} {n}</span>
        {words && <Pill tone="slate">{words}</Pill>}
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-line ${c.text}`}>{children}</p>
    </div>
  );
}

// Tâche 3 is an argued opinion built on two short documents — shown as the
// theme heading and a two-column pair of document cards.
function TaskThree({ data }) {
  const { c, t } = useApp();
  const docs = [data.doc1, data.doc2].filter(Boolean);
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} 3</span>
        <Pill tone="amber"><MessagesSquare size={12} /> {t("Argumenter")}</Pill>
      </div>
      {data.theme && <p className={`font-display font-bold ${c.text} mb-3`}>{data.theme}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map((doc, i) => (
          <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5"><FileText size={12} /> {t("Document")} {i + 1}</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{doc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// A single combinaison card (three tasks a candidate may receive together).
function Combinaison({ s }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{s.n}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Combinaison")} {s.n}</h2>
      </div>
      <div className="space-y-5">
        <Task n={1} words="60–120 mots">{s.t1}</Task>
        <div className={`border-t ${c.border}`} />
        <Task n={2} words="120–150 mots">{s.t2}</Task>
        <div className={`border-t ${c.border}`} />
        <TaskThree data={s.t3} />
      </div>
    </Card>
  );
}

// A tappable tile used for both the year grid and the month grid.
function Tile({ title, meta, onClick }) {
  const { c } = useApp();
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-3xl border ${c.border} ${c.card} card-lift p-5 flex items-center gap-4`}
    >
      <span className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><CalendarDays size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block font-display font-bold ${c.text}`}>{title}</span>
        <span className={`block text-sm ${c.faint}`}>{meta}</span>
      </span>
      <ChevronRight size={18} className={`shrink-0 ${c.faint} group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all`} />
    </button>
  );
}

// Layered archive: Année → Mois → Sujets. Selecting drills one level deeper
// (panel slides in from the right); the breadcrumb walks back out (slides from
// the left). Data is grouped in constants/sujetsEE.js.
export function SujetsExpressionEcrite() {
  const { c, t } = useApp();
  const [year, setYear] = useState(null);
  const [monthKey, setMonthKey] = useState(null);
  const [dir, setDir] = useState("fwd");

  const yearData = year != null ? SUJETS_EE_YEARS.find((y) => y.year === year) : null;
  const monthData = yearData && monthKey ? yearData.months.find((m) => m.key === monthKey) : null;
  const level = monthData ? 2 : yearData ? 1 : 0;

  const openYear = (y) => { setDir("fwd"); setYear(y); };
  const openMonth = (k) => { setDir("fwd"); setMonthKey(k); };
  const back = () => {
    setDir("back");
    if (monthKey) setMonthKey(null);
    else setYear(null);
  };

  const anim = dir === "fwd" ? "panel-in-right" : "panel-in-left";

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression écrite")}
      title={t("Sujets d'expression écrite")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez une année, puis un mois, pour voir les combinaisons de tâches dans leur formulation réelle.")}
    >
      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1.5 text-sm font-semibold mb-6">
        <button onClick={() => { setDir("back"); setYear(null); setMonthKey(null); }} className={level === 0 ? c.text : "text-blue-600"}>
          {t("Toutes les années")}
        </button>
        {yearData && <>
          <ChevronRight size={14} className={c.faint} />
          <button onClick={() => { setDir("back"); setMonthKey(null); }} className={level === 1 ? c.text : "text-blue-600"}>{yearData.year}</button>
        </>}
        {monthData && <>
          <ChevronRight size={14} className={c.faint} />
          <span className={c.text}>{monthData.month} {yearData.year}</span>
        </>}
      </div>

      {/* Level content — re-keyed so the slide/fade replays on each change */}
      <div key={level === 2 ? monthKey : level === 1 ? year : "root"} className={anim}>
        {level > 0 && (
          <button onClick={back} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-6">
            <ChevronLeft size={15} /> {level === 2 ? `${yearData.year}` : t("Toutes les années")}
          </button>
        )}

        {level === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUJETS_EE_YEARS.map((y) => (
              <Tile
                key={y.year}
                title={y.year}
                meta={`${plural(y.months.length, t("mois"), t("mois"))} · ${plural(y.months.reduce((a, m) => a + m.sujets.length, 0), t("combinaison"), t("combinaisons"))}`}
                onClick={() => openYear(y.year)}
              />
            ))}
          </div>
        )}

        {level === 1 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearData.months.map((m) => (
              <Tile
                key={m.key}
                title={`${m.month} ${yearData.year}`}
                meta={plural(m.sujets.length, t("combinaison"), t("combinaisons"))}
                onClick={() => openMonth(m.key)}
              />
            ))}
          </div>
        )}

        {level === 2 && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              <Pill tone="blue"><CalendarDays size={12} /> {monthData.month} {yearData.year}</Pill>
              <Pill tone="slate"><PenLine size={12} /> {plural(monthData.sujets.length, t("combinaison"), t("combinaisons"))}</Pill>
              <Pill tone="green">{t("3 tâches par sujet")}</Pill>
            </div>
            <div className="space-y-5">
              {monthData.sujets.map((s, i) => <Combinaison key={i} s={s} />)}
            </div>
          </>
        )}
      </div>

      {SUJETS_EE_YEARS.length === 0 && (
        <Card className="p-10 text-center">
          <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>{t("Bientôt disponible")}</p>
        </Card>
      )}
    </PageShell>
  );
}
