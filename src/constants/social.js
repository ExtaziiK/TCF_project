// The public channels, in one place. The footer row, the contact page and the
// Organization `sameAs` in the structured data all read from here, so adding a
// network or fixing a broken link is a single edit rather than a hunt.
//
// Kept as plain data (no JSX, no lucide import) on purpose: scripts/prerender.mjs
// bundles seo.js with esbuild for Node, and seo.js pulls SOCIAL_URLS from this
// file — dragging React into that bundle for the sake of an icon would be a bad
// trade. The glyphs live in components/common/SocialLinks.jsx and are looked up
// by `key`.
//
// URLs are the canonical share targets with the tracking query stripped
// (TikTok's "Copy link" button appends ?is_from_webapp=…&sender_device=pc,
// which identifies where the copy happened and is meaningless to a visitor).

export const CONTACT_EMAIL = "contact@tcfpasserelle.com";
export const SITE_URL = "https://www.tcfpasserelle.com";

// `tone` carries its own light/dark-safe colours: the app switches themes via
// the `c` object rather than Tailwind's `dark:` variant, so a mid-weight brand
// hue that reads on both canvases is the reliable choice.
export const SOCIAL = [
  {
    key: "youtube",
    label: "YouTube",
    handle: "@TCFPasserelle",
    d: "Cours, corrigés et méthode en vidéo",
    url: "https://www.youtube.com/@TCFPasserelle",
    tone: "text-red-600 bg-red-600/10",
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@tcfpasserelle",
    d: "Astuces courtes et pièges de l'examen",
    url: "https://www.tiktok.com/@tcfpasserelle",
    tone: "text-pink-600 bg-pink-600/10",
  },
  {
    key: "facebook",
    label: "Groupe Facebook",
    handle: "Groupe Passerelle TCF Canada",
    d: "Entraide entre candidats et annonces",
    url: "https://www.facebook.com/groups/2760698497636775",
    tone: "text-blue-600 bg-blue-600/10",
  },
  {
    key: "whatsapp",
    label: "Communauté WhatsApp",
    handle: "Rejoindre la communauté",
    d: "Sujets du mois et réponses rapides",
    url: "https://chat.whatsapp.com/KurRZ6cjCNE4caS3hdYo9D",
    tone: "text-emerald-600 bg-emerald-600/10",
  },
];

// `sameAs` for the Organization structured data: the profiles Google uses to
// tie these accounts to the site's knowledge-graph entity.
export const SOCIAL_URLS = SOCIAL.map((s) => s.url);
