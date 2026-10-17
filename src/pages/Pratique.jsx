import { useApp } from "@/context/AppContext";
import { PageShell, EmbeddedShell } from "@/components/common/PageShell";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { deniedReason } from "@/auth/rbac";
import { toolTone } from "@/components/home/toolsData";
import { PRATIQUE_MENU } from "@/constants/navigation";
import { Carnet } from "@/pages/Carnet";
import { Vocabulary } from "@/pages/Vocabulary";
import { Grammar } from "@/pages/Grammar";
import { Conjugation } from "@/pages/Conjugation";
import { Dictee } from "@/pages/Dictee";
import { Revision } from "@/pages/Revision";

// The Pratique hub: every practice tool on one page, as a ring binder — the
// candidate's « cahier d'entraînement ». Index tabs down the left (a row of
// chips on small screens) pick the tool; the selected tab takes the tool's
// colour and runs into the binder's spine, and the tool itself opens on the
// sheet: a solid spine, a header strip, then the tool on faintly ruled
// paper in its colour. Deliberately not the Épreuves layout (tiles above a
// tinted panel): this one reads as a notebook you work in.
//
// All six practice routes render this page (pages/index.jsx), each opening
// its own tab, so /vocabulaire, /dictee… still land on the right tool and the
// guided tour's per-page targets still exist. Switching tabs replaces the URL
// without scrolling or remounting the page (App keys the hub as one page).
// Each tool renders through its own RouteGuard inside the sheet, so a free
// account sees the dictée's pitch in the binder rather than instead of it;
// the tool pages render compactly there via EmbeddedShell.

const TOOLS = {
  carnet: { page: Carnet, tone: "amber", tag: "Vos fautes, classées pour ne plus les refaire" },
  vocabulary: { page: Vocabulary, tone: "mint", tag: "Le lexique du quotidien et de l'immigration" },
  grammar: { page: Grammar, tone: "fuchsia", tag: "Des leçons courtes, des exercices immédiats" },
  conjugation: { page: Conjugation, tone: "cyan", tag: "Les temps qui comptent, jusqu'aux automatismes" },
  dictee: { page: Dictee, tone: "navy", tag: "Un corrigé C1/C2 à écrire mot à mot" },
  revision: { page: Revision, tone: "rose", tag: "Les questions difficiles, avec leur correction" },
};

// `premium`: the tool needs a forfait this account doesn't have. Its tab is
// greyed with a « Premium » mention but stays clickable — the sheet then shows
// the tool's pitch or the upgrade gate.
function useTools() {
  const { role, user } = useApp();
  return PRATIQUE_MENU.filter((m) => TOOLS[m.r]).map((m) => ({
    ...m, ...TOOLS[m.r], soon: !!m.soon?.(role), premium: deniedReason(role, m.r, user) === "upgrade",
  }));
}

function PremiumTag({ on }) {
  const { t } = useApp();
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${on ? "bg-white/25 text-white" : "bg-amber-400 text-slate-900"}`}>
      {t("Premium")}
    </span>
  );
}

// Desktop index tab. Unselected: a white tab with a coloured edge, set back
// from the binder. Selected: filled with the tool's colour and reaching into
// the spine, which is the same colour, so tab and binder read as one piece.
function IndexTab({ tool, on, onSelect }) {
  const { t, dark, c } = useApp();
  const k = toolTone(tool.tone, dark);
  return (
    <button type="button" onClick={onSelect} disabled={tool.soon} aria-current={on ? "page" : undefined}
      className={`relative flex items-center gap-3 text-left rounded-l-2xl py-3 pl-3 pr-4 border-2 border-r-0 transition-all duration-300 disabled:opacity-55 disabled:cursor-not-allowed
        ${on ? "-mr-[2px] z-10 shadow-lg" : `${c.card} mr-5 enabled:hover:mr-2 border-l-[6px] ${tool.premium ? "grayscale opacity-60 hover:opacity-90" : ""}`}`}
      style={on ? { background: k.fill, borderColor: k.fill } : { borderColor: k.edge, borderLeftColor: k.fill }}>
      <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
        style={on ? { background: "rgba(255,255,255,.2)", color: "#FFFFFF" } : { background: k.panel, color: k.ink }}>
        <tool.icon size={19} />
      </span>
      <span className="min-w-0">
        <span className={`flex items-center gap-2 font-display font-bold leading-tight ${on ? "text-white" : c.text}`}>
          {t(tool.l)}
          {tool.soon && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: k.panel, color: k.ink }}>{t("Bientôt")}</span>}
          {tool.premium && !tool.soon && <PremiumTag on={on} />}
        </span>
        <span className={`mt-0.5 block text-xs leading-snug ${on ? "text-white/80" : c.faint}`}>{t(tool.tag)}</span>
      </span>
    </button>
  );
}

// Small-screen tab: a chip in a horizontally scrolling row.
function ChipTab({ tool, on, onSelect }) {
  const { t, dark, c } = useApp();
  const k = toolTone(tool.tone, dark);
  return (
    <button type="button" onClick={onSelect} disabled={tool.soon} aria-current={on ? "page" : undefined}
      className={`snap-start shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-sm font-bold disabled:opacity-55 ${on ? "text-white" : `${c.card} ${c.text} ${tool.premium ? "grayscale opacity-60" : ""}`}`}
      style={on ? { background: k.fill, borderColor: k.fill } : { borderColor: k.edge }}>
      <tool.icon size={16} style={on ? undefined : { color: k.ink }} />
      {t(tool.l)}
      {tool.premium && !tool.soon && <PremiumTag on={on} />}
    </button>
  );
}

export function Pratique() {
  const { route, nav, t, dark } = useApp();
  const tools = useTools();
  const active = tools.find((x) => x.r === route) || tools.find((x) => !x.soon) || tools[0];
  const k = toolTone(active.tone, dark);
  const select = (r) => nav(r, { replace: true, scroll: false });
  const Tool = active.page;

  return (
    <PageShell wide eyebrow={t("Pratique")} title={t("Votre cahier d'entraînement")}
      sub={t("Six outils pour consolider vos acquis entre deux épreuves. Choisissez un onglet : tout se passe sur cette page.")}>
      <div className="lg:hidden -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto snap-x pb-1">
        {tools.map((tl) => <ChipTab key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} />)}
      </div>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <nav aria-label={t("Pratique")} className="hidden lg:flex flex-col gap-2.5 pt-10">
          {tools.map((tl) => <IndexTab key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} />)}
        </nav>

        {/* The sheet. `--tool-fill` lets selected tabs/chips inside the tool
            take its colour (see PageShell). */}
        <div className="flex min-w-0 rounded-[28px] border-2 transition-colors duration-300" style={{ borderColor: k.fill, "--tool-fill": k.fill }}>
          {/* The spine, in the tool's colour (plain: punched ring holes read as stray dots). */}
          <div aria-hidden="true" className="w-5 md:w-7 shrink-0 rounded-l-[26px]"
            style={{ background: k.fill }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 px-5 md:px-8 py-4 border-b-2 rounded-tr-[26px]" style={{ background: k.panel, borderColor: k.edge }}>
              <span className="grid place-items-center w-10 h-10 rounded-xl text-white shrink-0" style={{ background: k.fill }}><active.icon size={19} /></span>
              <div className="min-w-0">
                <p className="font-display font-extrabold text-lg leading-tight" style={{ color: k.ink }}>{t(active.l)}</p>
                <p className="text-xs font-semibold opacity-80" style={{ color: k.ink }}>{t(active.tag)}</p>
              </div>
            </div>
            {/* Ruled "notebook paper" in the tool's colour. */}
            <div className="p-4 md:p-6 lg:p-8 rounded-br-[26px]"
              style={{ backgroundColor: k.pale, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 35px, ${k.ink}17 35px 36px)` }}>
              <EmbeddedShell.Provider value>
                <RouteGuard route={active.r} inner><Tool key={active.r} /></RouteGuard>
              </EmbeddedShell.Provider>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
