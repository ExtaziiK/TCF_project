import { useApp } from "@/context/AppContext";
import { PageShell, EmbeddedShell } from "@/components/common/PageShell";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { deniedReason } from "@/auth/rbac";
import { PALETTE, toolTone } from "@/components/home/toolsData";
import { PRATIQUE_MENU } from "@/constants/navigation";
import { Carnet } from "@/pages/Carnet";
import { Vocabulary } from "@/pages/Vocabulary";
import { Grammar } from "@/pages/Grammar";
import { Conjugation } from "@/pages/Conjugation";
import { Dictee } from "@/pages/Dictee";
import { Revision } from "@/pages/Revision";

// The Pratique hub: every practice tool in one notebook — the candidate's
// « cahier d'entraînement ». The page is a sheet of French school paper
// (lignage Seyès, ruled in a faint version of the tool's colour) with two
// more sheets peeking out beneath, and the tools are page markers sticking out
// of its left edge (its top edge on small screens): the selected one sticks
// out further, filled with the tool's colour, and joins the page's edge of the
// same colour; the others are pale, tucked under the page. The tool itself is
// written on the paper, right of the margin.
//
// The hub has its own address ("entrainement", the nav's « Pratique » link)
// and every practice route renders it on its own marker, so /vocabulaire,
// /dictee… still land on the right tool and the guided tour's per-page
// targets still exist. Switching markers replaces the URL without scrolling
// or remounting the page (App keys the hub as one page). Each tool renders
// through its own RouteGuard inside the page, so a free account sees the
// dictée's pitch in the notebook rather than instead of it; the tool pages
// render compactly there via EmbeddedShell.

const TOOLS = {
  carnet: { page: Carnet, tone: "amber", tag: "Vos fautes, classées pour ne plus les refaire" },
  vocabulary: { page: Vocabulary, tone: "mint", tag: "Le lexique du quotidien et de l'immigration" },
  grammar: { page: Grammar, tone: "fuchsia", tag: "Des leçons courtes, des exercices immédiats" },
  conjugation: { page: Conjugation, tone: "cyan", tag: "Les temps qui comptent, jusqu'aux automatismes" },
  dictee: { page: Dictee, tone: "navy", tag: "Un corrigé C1/C2 à écrire mot à mot" },
  revision: { page: Revision, tone: "rose", tag: "Les questions difficiles, avec leur correction" },
};

// `premium`: the tool needs a forfait this account doesn't have. Its marker is
// greyed with a « Premium » mention but stays clickable — the page then shows
// the tool's pitch or the upgrade gate.
function useTools() {
  const { role, user } = useApp();
  return PRATIQUE_MENU.filter((m) => TOOLS[m.r]).map((m) => ({
    ...m, ...TOOLS[m.r], soon: !!m.soon?.(role), premium: deniedReason(role, m.r, user) === "upgrade",
  }));
}

// `a` blended toward `b` by `w` (0–1), both #RRGGBB.
function mix(a, b, w) {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - w) + ch(b, i) * w).toString(16).padStart(2, "0")).join("")}`;
}

function Badge({ on, children, tone }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${on ? "bg-white/25 text-white" : tone}`}>
      {children}
    </span>
  );
}

// A page marker, sticking out of the notebook's left edge (`side="left"`,
// from lg) or its top edge (small screens). Unselected: pale and set back.
// Selected: sticks out further, filled, meeting the page's coloured edge.
function Marker({ tool, on, onSelect, side }) {
  const { t, dark } = useApp();
  const k = toolTone(tool.tone, dark);
  const pale = PALETTE[tool.tone][dark ? "dark" : "light"][0];
  const left = side === "left";
  const shape = left
    ? `flex-col justify-center text-center rounded-l-2xl px-2.5 py-5 border-r-0 leading-tight ${on ? "ml-0" : "ml-4 enabled:hover:ml-2"}`
    : `shrink-0 rounded-t-2xl px-3.5 sm:px-4 pt-2.5 pb-6 border-b-0 whitespace-nowrap ${on ? "mt-0" : "mt-3 enabled:hover:mt-1.5"}`;
  const accent = left ? { borderLeftColor: k.fill, borderLeftWidth: 5 } : { borderTopColor: k.fill, borderTopWidth: 4 };
  return (
    <button type="button" onClick={onSelect} disabled={tool.soon} aria-current={on ? "page" : undefined}
      className={`relative flex items-center gap-2 border-2 text-sm font-bold transition-all duration-300 ${left ? "" : "text-left"} ${shape}
        disabled:opacity-55 disabled:cursor-not-allowed
        ${on ? "z-30 text-white shadow-md" : `z-0 ${tool.premium ? "grayscale opacity-60 hover:opacity-90" : ""}`}`}
      style={on ? { background: k.fill, borderColor: k.fill } : { background: pale, borderColor: k.edge, ...accent, color: k.ink }}>
      <tool.icon size={left ? 20 : 16} />
      {t(tool.l)}
      {tool.soon && <Badge on={on} tone="bg-white/70 text-slate-700">{t("Bientôt")}</Badge>}
      {tool.premium && !tool.soon && <Badge on={on} tone="bg-amber-400 text-slate-900">{t("Premium")}</Badge>}
    </button>
  );
}

export function Pratique() {
  const { route, nav, t, dark, c } = useApp();
  const tools = useTools();
  // The hub's own address opens on the first tool the account can use.
  const active = tools.find((x) => x.r === route)
    || tools.find((x) => !x.soon && !x.premium) || tools.find((x) => !x.soon) || tools[0];
  const k = toolTone(active.tone, dark);
  const select = (r) => nav(r, { replace: true, scroll: false });
  const Tool = active.page;
  const sheet = dark ? "border-slate-700" : "border-slate-300";
  // The page: a lighter shade of the marker's pale colour (toward white, or
  // toward the dark canvas in dark mode).
  const paper = mix(PALETTE[active.tone][dark ? "dark" : "light"][0], dark ? "#0B1222" : "#FFFFFF", 0.45);

  return (
    <PageShell wide eyebrow={t("Pratique")} title={t("Votre cahier d'entraînement")}
      sub={t("Six outils, un seul cahier : choisissez un marque-page.")}>
      {/* Small screens: the markers poke out of the notebook's top edge, in a
          row that scrolls sideways; the page overlaps their feet. */}
      <nav aria-label={t("Pratique")} className="lg:hidden flex items-end gap-1.5 sm:gap-2 px-6 overflow-x-auto -mb-4">
        {tools.map((tl) => <Marker key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} side="top" />)}
      </nav>

      {/* Tall, narrow markers: icon above the name. */}
      <div className="lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start">
      {/* From lg: the markers stick out of the notebook's left edge and end
          exactly at it — the selected one meets the page's coloured edge. */}
      <nav aria-label={t("Pratique")} className="hidden lg:flex flex-col gap-2 pt-20">
        {tools.map((tl) => <Marker key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} side="left" />)}
      </nav>

      <div className="relative z-10">
        {/* The sheets beneath, peeking out at the bottom. */}
        <div aria-hidden="true" className={`absolute left-6 right-6 top-6 -bottom-4 rounded-[22px] border ${sheet} ${c.card}`} />
        <div aria-hidden="true" className={`absolute left-3 right-3 top-3 -bottom-2 rounded-[22px] border ${sheet} ${c.card}`} />

        {/* The page. `--tool-fill` lets selected tabs/chips inside the tool
            take its colour (see PageShell). */}
        <div className={`relative rounded-[22px] border-2 shadow-sm ${sheet}`} style={{ "--tool-fill": k.fill, borderLeftColor: k.fill, borderLeftWidth: 6 }}>
          <div className="flex items-center gap-3 px-5 md:px-8 py-3.5 rounded-tr-[20px] rounded-tl-[16px] text-white transition-colors duration-300" style={{ background: k.fill }}>
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/20 shrink-0"><active.icon size={18} /></span>
            <div className="min-w-0">
              <p className="font-display font-extrabold text-lg leading-tight">{t(active.l)}</p>
              <p className="text-xs font-semibold text-white/80">{t(active.tag)}</p>
            </div>
          </div>
          {/* Seyès-ruled paper (.seyes in index.css): tinted a lighter shade of
              the tool's colour, with very faint lines in that colour.
              `.tool-paper` gives the tool's boxes and outlined buttons a
              visible outline in its colour (also index.css). */}
          <div className={`seyes tool-paper rounded-br-[20px] rounded-bl-[16px] py-6 md:py-8 pr-4 md:pr-8 pl-[52px] md:pl-[92px] ${dark ? "seyes-dark" : ""}`}
            style={{ "--paper": paper, "--fine": `${k.ink}08`, "--main": `${k.ink}12`, "--margin": `${k.ink}30`, "--outline": `${k.ink}66` }}>
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
