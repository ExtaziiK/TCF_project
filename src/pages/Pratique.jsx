import { useLayoutEffect, useRef, useState } from "react";
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

function Badge({ children, tone }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${tone}`}>
      {children}
    </span>
  );
}

// A page marker, sticking out of the notebook's left edge (`side="left"`,
// from lg) or its top edge (small screens). Unselected: pale and set back.
// On phones the six top markers share the width equally and show only their
// icon — the page's header right below names the selected tool — so they all
// fit without scrolling; the name comes back from md.
// Selected: sticks out further, filled, meeting the page's coloured edge.
// Backgrounds stay neutral; the colour is in the outline (full colour when
// selected) and the label.
function Marker({ tool, on, onSelect, side, sink }) {
  const { t, dark, c } = useApp();
  const k = toolTone(tool.tone, dark);
  const left = side === "left";
  const shape = left
    ? `flex-col justify-center text-center rounded-l-2xl px-2.5 py-5 border-r-0 leading-tight ${on ? "translate-x-0" : "translate-x-4 enabled:hover:translate-x-2"}`
    : `flex-1 md:flex-none justify-center min-w-0 rounded-t-2xl px-2 md:px-4 pt-2.5 pb-6 border-b-0 whitespace-nowrap ${on ? "translate-y-0" : "translate-y-3 enabled:hover:translate-y-1.5"}`;
  const accent = left ? { borderLeftColor: k.fill, borderLeftWidth: 5 } : { borderTopColor: k.fill, borderTopWidth: 4 };
  return (
    <button type="button" onClick={onSelect} disabled={tool.soon} aria-current={on ? "page" : undefined}
      title={left ? undefined : t(tool.l)}
      className={`relative flex items-center gap-2 border-2 text-sm font-bold ${on ? "" : "transition-[transform,color,border-color,box-shadow,opacity,filter] duration-300 ease-out"} ${left ? "" : "text-left"} ${shape}
        disabled:opacity-55 disabled:cursor-not-allowed
        ${c.card} ${on ? "z-30 shadow-md" : `z-0 ${tool.premium ? "grayscale opacity-60 hover:opacity-90" : ""}`}`}
      style={on ? { borderColor: k.fill, color: k.ink } : { borderColor: k.edge, ...accent, color: k.ink }}>
      {on && <Joins left={left} sink={sink} line={k.fill} fill={dark ? "#0F172A" : "#FFFFFF"} />}
      <tool.icon size={left ? 20 : 18} className="shrink-0 md:w-4 md:h-4" />
      <span className={left ? "contents" : "sr-only md:not-sr-only md:contents"}>
        {t(tool.l)}
        {tool.soon && <Badge tone="bg-slate-500/15 text-slate-500">{t("Bientôt")}</Badge>}
        {tool.premium && !tool.soon && <Badge tone="bg-amber-400 text-slate-900">{t("Premium")}</Badge>}
      </span>
      {/* Phones, icon only: a dot stands in for the Premium badge. */}
      {!left && tool.premium && !tool.soon && <span aria-hidden="true" className="md:hidden absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />}
    </button>
  );
}

// The selected marker's join with the page: instead of meeting it at a sharp
// corner, its outline bends into the page edge along a small curve on each
// side (a concave quarter circle: transparent inside, the outline on the
// arc, the marker's colour beyond it). Each one overlaps the marker's own
// 2px border so the straight edge stops where the curve starts. A top marker's
// foot sinks into the page by `sink` px (measured, see Pratique): its curves
// end on the page's top border, and the foot below is covered so the side
// lines don't run on into the page.
const R = 14;
function Joins({ left, sink, line, fill }) {
  const arc = (at) => ({ width: R, height: R, background: `radial-gradient(circle at ${at}, transparent ${R - 2}px, ${line} ${R - 2}px, ${line} ${R}px, ${fill} ${R}px)` });
  const base = "pointer-events-none absolute";
  return left ? (
    <>
      <span aria-hidden="true" className={base} style={{ ...arc("0 0"), right: 0, top: -R }} />
      <span aria-hidden="true" className={base} style={{ ...arc("0 100%"), right: 0, bottom: -R }} />
    </>
  ) : (
    <>
      <span aria-hidden="true" className={base} style={{ ...arc("0 0"), left: -R, bottom: sink - 2 }} />
      <span aria-hidden="true" className={base} style={{ ...arc("100% 0"), right: -R, bottom: sink - 2 }} />
      <span aria-hidden="true" className={base} style={{ left: -2, right: -2, bottom: 0, height: Math.max(0, sink - 2), background: fill }} />
    </>
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
  // How far the selected top marker's foot reaches into the page, measured
  // rather than assumed: its curves have to land exactly on the page's edge.
  const topNav = useRef(null);
  const page = useRef(null);
  const [sink, setSink] = useState(16);
  useLayoutEffect(() => {
    const measure = () => {
      // The nav's bottom is where every marker's foot ends (items-end); the
      // selected one itself may still be sliding up, so it isn't measured.
      const bar = topNav.current;
      if (!bar || !page.current || !bar.offsetParent) return;
      setSink(Math.round(bar.getBoundingClientRect().bottom - page.current.getBoundingClientRect().top));
    };
    measure();
    const ro = new window.ResizeObserver(measure);
    if (topNav.current) ro.observe(topNav.current);
    if (page.current) ro.observe(page.current);
    return () => ro.disconnect();
  }, [active.r]);
  const Tool = active.page;
  const sheet = dark ? "border-slate-700" : "border-slate-300";
  // The page: neutral paper — the tool's colour is only in its outline, the
  // header's rule and the faint Seyès lines.
  const paper = dark ? "#0B1222" : "#FFFFFF";

  return (
    <PageShell wide eyebrow={t("Exercices")} title={t("Votre cahier d'entraînement")}
      sub={t("Six outils, un seul cahier : choisissez un marque-page.")}>
      {/* Small screens: the markers poke out of the notebook's top edge, in
          one row (icons only on phones, so it fits; from md it scrolls
          sideways if needed); the page overlaps their feet. */}
      <nav ref={topNav} aria-label={t("Exercices")} className="lg:hidden flex items-end gap-2 px-4 md:px-6 md:overflow-x-auto -mb-4">
        {tools.map((tl) => <Marker key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} side="top" sink={sink} />)}
      </nav>

      {/* Tall, narrow markers: icon above the name. The row stretches, so the
          page is always at least as tall as the marker column — a short tool
          never leaves markers hanging below it. */}
      <div className="lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:items-stretch">
      {/* From lg: the markers stick out of the notebook's left edge and end
          exactly at it — the selected one meets the page's coloured edge. The
          bottom padding (about one marker) carries the page past the last one. */}
      <nav aria-label={t("Exercices")} className="hidden lg:flex flex-col gap-2 pt-20 pb-28">
        {tools.map((tl) => <Marker key={tl.r} tool={tl} on={tl.r === active.r} onSelect={() => select(tl.r)} side="left" />)}
      </nav>

      <div className="relative z-10">
        {/* The sheets beneath, peeking out at the bottom. */}
        <div aria-hidden="true" className={`absolute left-6 right-6 top-6 -bottom-4 rounded-[22px] border ${sheet} ${c.card}`} />
        <div aria-hidden="true" className={`absolute left-3 right-3 top-3 -bottom-2 rounded-[22px] border ${sheet} ${c.card}`} />

        {/* The page. `--tool-fill` lets selected tabs/chips inside the tool
            take its colour (see PageShell). */}
        <div ref={page} className={`relative h-full flex flex-col rounded-[22px] border-2 shadow-sm ${sheet}`} style={{ "--tool-fill": k.fill, borderLeftColor: k.fill, borderLeftWidth: 6 }}>
          <div className={`flex items-center gap-3 px-5 md:px-8 py-3.5 rounded-tr-[20px] rounded-tl-[16px] border-b-2 ${c.card}`} style={{ borderBottomColor: k.fill }}>
            <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0" style={{ background: k.panel, color: k.ink }}><active.icon size={18} /></span>
            <div className="min-w-0">
              <p className={`font-display font-extrabold text-lg leading-tight ${c.text}`}>{t(active.l)}</p>
              <p className={`text-xs font-semibold ${c.sub}`}>{t(active.tag)}</p>
            </div>
          </div>
          {/* Seyès-ruled paper (.seyes in index.css): neutral, with very faint
              lines in the tool's colour.
              `.tool-paper` gives the tool's boxes and outlined buttons a
              visible outline in its colour (also index.css). */}
          <div className={`seyes tool-paper flex-1 rounded-br-[20px] rounded-bl-[16px] py-6 md:py-8 pr-3 md:pr-8 pl-8 md:pl-[92px] ${dark ? "seyes-dark" : ""}`}
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
