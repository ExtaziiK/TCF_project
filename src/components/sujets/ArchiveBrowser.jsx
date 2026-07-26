import { useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";

// A tappable tile for the year grid and the month grid.
function Tile({ title, meta, onClick }) {
  const { c } = useApp();
  return (
    <button onClick={onClick} className={`group text-left rounded-3xl border ${c.border} ${c.card} card-lift p-5 flex items-center gap-4`}>
      <span className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><CalendarDays size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block font-display font-bold ${c.text}`}>{title}</span>
        <span className={`block text-sm ${c.faint}`}>{meta}</span>
      </span>
      <ChevronRight size={18} className={`shrink-0 ${c.faint} group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all`} />
    </button>
  );
}

// Layered archive browser shared by the EE and EO subject pages: Année → Mois →
// contenu. Drilling in slides the incoming panel from the right; the breadcrumb
// walks back out (slides from the left). The leaf (a month's subjects) is drawn
// by `renderMonth`, so each épreuve keeps its own layout.
export function ArchiveBrowser({ years, loading, renderMonth, yearMeta, monthMeta }) {
  const { c, t } = useApp();
  const [year, setYear] = useState(null);
  const [mkey, setMkey] = useState(null);
  const [dir, setDir] = useState("fwd");

  const yearData = year != null ? years.find((y) => y.year === year) : null;
  const monthData = yearData && mkey ? yearData.months.find((m) => m.key === mkey) : null;
  const level = monthData ? 2 : yearData ? 1 : 0;
  const anim = dir === "fwd" ? "panel-in-right" : "panel-in-left";

  const back = () => { setDir("back"); if (mkey) setMkey(null); else setYear(null); };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5 h-[76px] animate-pulse" />)}
      </div>
    );
  }

  if (!years.length) {
    return (
      <Card className="p-10 text-center">
        <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
        <p className={`font-display font-bold ${c.text}`}>{t("Bientôt disponible")}</p>
        <p className={`mt-2 text-sm ${c.sub}`}>{t("Les sujets seront ajoutés très prochainement.")}</p>
      </Card>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1.5 text-sm font-semibold mb-6">
        <button onClick={() => { setDir("back"); setYear(null); setMkey(null); }} className={level === 0 ? c.text : "text-blue-600"}>{t("Toutes les années")}</button>
        {yearData && <><ChevronRight size={14} className={c.faint} /><button onClick={() => { setDir("back"); setMkey(null); }} className={level === 1 ? c.text : "text-blue-600"}>{yearData.year}</button></>}
        {monthData && <><ChevronRight size={14} className={c.faint} /><span className={c.text}>{monthData.month} {yearData.year}</span></>}
      </div>

      <div key={level === 2 ? mkey : level === 1 ? year : "root"} className={anim}>
        {level > 0 && (
          <button onClick={back} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-6">
            <ChevronLeft size={15} /> {level === 2 ? String(yearData.year) : t("Toutes les années")}
          </button>
        )}

        {level === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {years.map((y) => (
              <Tile key={y.year} title={y.year} meta={yearMeta(y)} onClick={() => { setDir("fwd"); setYear(y.year); }} />
            ))}
          </div>
        )}

        {level === 1 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearData.months.map((m) => (
              <Tile key={m.key} title={`${m.month} ${yearData.year}`} meta={monthMeta(m)} onClick={() => { setDir("fwd"); setMkey(m.key); }} />
            ))}
          </div>
        )}

        {level === 2 && renderMonth(monthData, yearData)}
      </div>
    </>
  );
}
