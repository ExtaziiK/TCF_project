export function getTheme(dark) {
  // `bg` is a custom class (see src/styles/index.css) that paints the page with
  // a soft brand-tinted gradient (blue→lavender→rose) instead of flat white/
  // slate, so the negative space carries the palette. Cards stay opaque for
  // contrast. Footer / tinted sections lean on a light blue wash.
  return dark
    ? { bg: "app-bg-dark", text: "text-slate-100", sub: "text-slate-400", faint: "text-slate-500", card: "bg-slate-900", border: "border-slate-800", navBorder: "border-slate-800/80", nav: "bg-slate-950/80", navFade: "from-slate-950/80", tint: "bg-slate-900/50", footer: "bg-slate-900/40", track: "bg-slate-800", hoverSoft: "hover:bg-slate-800/70", inputCls: "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500" }
    : { bg: "app-bg-light", text: "text-slate-900", sub: "text-slate-600", faint: "text-slate-400", card: "bg-white", border: "border-slate-200", navBorder: "border-slate-200/80", nav: "bg-white/80", navFade: "from-white/80", tint: "bg-blue-50/60", footer: "bg-blue-50/50", track: "bg-slate-200", hoverSoft: "hover:bg-slate-100", inputCls: "bg-white border-slate-200 text-slate-900 placeholder-slate-400" };
}

// Persists the dark-mode choice across reloads, mirroring the i18n language
// persistence (src/i18n/index.js). Defaults to light on a first visit — no
// stored value yet — so behaviour is unchanged until the user picks a theme.
const DARK_KEY = "passerelle.dark";

export function loadDark() {
  try { return localStorage.getItem(DARK_KEY) === "1"; } catch { return false; }
}

export function saveDark(dark) {
  try { localStorage.setItem(DARK_KEY, dark ? "1" : "0"); } catch { /* private mode: preference just won't persist */ }
}
