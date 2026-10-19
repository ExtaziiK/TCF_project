import { useEffect, useState } from "react";
import { ANNOUNCEMENTS } from "@/constants/announcements";
import { getAnnouncementBar } from "@/services/settingsService";
import BUILT from "virtual:announcement-bar";

// The announcement bar's admin settings (Admin › Accueil › Barre d'annonces):
// whether it is on, and its messages. Read by the app shell, which reserves the
// bar's 40px only when it will actually show — the bar hiding itself while the
// shell still pushed the nav and page down left an empty strip at the top.
//
// The last answer is cached in localStorage, so the first frame already matches
// the saved setting and nothing jumps when the database answers. A first visit
// has no cache and starts from the setting read at build time
// (scripts/announcementBarPlugin.mjs). One fetch per
// page load, however many components ask.
const CACHE_KEY = "announce-bar";
let request = null;

function cached() {
  try {
    const c = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    return c && typeof c.enabled === "boolean" ? c : null;
  } catch {
    return null;
  }
}

const shape = (c) => ({ enabled: c ? c.enabled : true, messages: c?.messages?.length ? c.messages : ANNOUNCEMENTS });

export function useAnnouncementBar() {
  const [cfg, setCfg] = useState(() => shape(cached() || BUILT));
  useEffect(() => {
    let live = true;
    (request ||= getAnnouncementBar()).then((c) => {
      try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled: c.enabled, messages: c.messages })); } catch { /* storage blocked */ }
      if (live) setCfg(shape(c));
    }, () => {});
    return () => { live = false; };
  }, []);
  return cfg;
}
