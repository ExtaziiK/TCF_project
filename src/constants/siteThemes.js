// Seasonal looks for the whole site, picked by an admin (Admin › Accueil ›
// Thème) and stored in site_settings.site_theme. A theme only restyles the
// decoration — the stickers in the page margins (components/decor) and an
// ambient layer (snow, bats) — never the content, the brand colours or the
// light/dark canvas. "default" is the year-round look.

export const DEFAULT_SITE_THEME = "default";

export const SITE_THEMES = [
  { id: "default", label: "Par défaut", description: "Bulles, lettres accentuées, feuilles d'érable et avion en papier." },
  { id: "halloween", label: "Halloween", description: "Citrouilles, fantômes et chauves-souris aux couleurs d'Halloween." },
  { id: "christmas", label: "Noël", description: "Flocons qui tombent, sapins, cadeaux, boules et guirlandes lumineuses." },
];

export const isSiteTheme = (id) => SITE_THEMES.some((t) => t.id === id);
