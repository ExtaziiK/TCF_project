import { useEffect, useState } from "react";
import { getSiteTheme } from "@/services/settingsService";
import { DEFAULT_SITE_THEME, isSiteTheme } from "@/constants/siteThemes";

// The seasonal theme an admin picked (Admin › Accueil › Thème). Every sticker
// layer and the ambient layer ask, so the answer is shared: one fetch per page
// load, and applySiteTheme() pushes a new value to every mounted reader at once
// (the admin sees their choice applied without reloading).
//
// The last answer is cached in localStorage, so a returning visitor's first
// frame already shows the right stickers. A first visit starts from the default
// look; the stickers are absolutely positioned, so the swap moves nothing.
const CACHE_KEY = "site-theme";
const listeners = new Set();
let request = null;
let current = cached();

function cached() {
  try {
    const v = window.localStorage.getItem(CACHE_KEY);
    return isSiteTheme(v) ? v : DEFAULT_SITE_THEME;
  } catch {
    return DEFAULT_SITE_THEME;
  }
}

export function applySiteTheme(theme) {
  current = isSiteTheme(theme) ? theme : DEFAULT_SITE_THEME;
  try { window.localStorage.setItem(CACHE_KEY, current); } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn(current));
}

export function useSiteTheme() {
  const [theme, setTheme] = useState(current);
  useEffect(() => {
    listeners.add(setTheme);
    setTheme(current);
    (request ||= getSiteTheme().then(applySiteTheme, () => {}));
    return () => { listeners.delete(setTheme); };
  }, []);
  return theme;
}
