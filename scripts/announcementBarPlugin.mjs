// Vite plugin: `virtual:announcement-bar` = { enabled, messages } as saved in
// Admin › Accueil › Barre d'annonces when the site was built, or null if the
// database could not be read.
//
// useAnnouncementBar caches the live setting in localStorage, but a first
// visit has no cache. It used to assume "on", lay the 40px bar out, then drop
// it when the database said "off": the whole page jumped up 40px on every
// first visit (PageSpeed CLS 0.049, every page). With the build's answer as
// the default, the first frame matches the setting. A change made in the admin
// after a deploy still applies to first visits after a single shift, and
// immediately for anyone who has the page cached.

const ID = "virtual:announcement-bar";

async function readSetting(url, key) {
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?select=value&key=eq.announcement_bar`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const [row] = await res.json();
    if (!row?.value) return null;
    const p = JSON.parse(row.value);
    // Same reading as settingsService.getAnnouncementBar.
    const messages = Array.isArray(p?.messages) ? p.messages.filter((m) => typeof m === "string") : null;
    return { enabled: p?.enabled !== false, messages: messages?.length ? messages : null };
  } catch {
    return null; // offline build: fall back to the runtime default
  }
}

export function announcementBarPlugin() {
  let env = {};
  return {
    name: "announcement-bar",
    configResolved(config) { env = config.env; },
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    async load(id) {
      if (id !== `\0${ID}`) return null;
      const setting = await readSetting(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
      return `export default ${JSON.stringify(setting)};`;
    },
  };
}
