export function getTheme(dark) {
  return dark
    ? { bg: "bg-slate-950", text: "text-slate-100", sub: "text-slate-400", faint: "text-slate-500", card: "bg-slate-900", border: "border-slate-800", navBorder: "border-slate-800/80", nav: "bg-slate-950/80", tint: "bg-slate-900/50", footer: "bg-slate-950", track: "bg-slate-800", hoverSoft: "hover:bg-slate-800/70", inputCls: "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500" }
    : { bg: "bg-slate-50", text: "text-slate-900", sub: "text-slate-600", faint: "text-slate-400", card: "bg-white", border: "border-slate-200", navBorder: "border-slate-200/80", nav: "bg-white/80", tint: "bg-blue-50/60", footer: "bg-white", track: "bg-slate-200", hoverSoft: "hover:bg-slate-100", inputCls: "bg-white border-slate-200 text-slate-900 placeholder-slate-400" };
}
