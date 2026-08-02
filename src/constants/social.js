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

// `tone` is only the tint behind the mark on the contact cards: the brand hue
// at 10%, which sits correctly on both canvases without Tailwind's `dark:`
// variant (the app switches themes through the `c` object instead). It carries
// no text colour — the marks in SocialLinks.jsx bring their own fills. TikTok
// tints neutral, its logo being three colours at once.
export const SOCIAL = [
  {
    key: "youtube",
    label: "YouTube",
    handle: "@TCFPasserelle",
    d: "Cours, corrigés et méthode en vidéo",
    url: "https://www.youtube.com/@TCFPasserelle",
    // Where a CLICK goes, when it should differ from `url`. YouTube's
    // ?sub_confirmation=1 opens the subscribe dialog on arrival instead of
    // dropping the visitor on a channel page they then have to act on.
    // Deliberately not folded into `url`: that one feeds sameAs in the
    // structured data, which must stay the plain canonical profile address —
    // an action parameter there describes no entity and is the sort of thing
    // that gets a sameAs entry disregarded.
    cta: "https://www.youtube.com/@TCFPasserelle?sub_confirmation=1",
    tone: "bg-[#FF0000]/10",
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@tcfpasserelle",
    d: "Astuces courtes et pièges de l'examen",
    url: "https://www.tiktok.com/@tcfpasserelle",
    tone: "bg-slate-500/10",
  },
  {
    key: "facebook",
    label: "Groupe Facebook",
    handle: "Groupe Passerelle TCF Canada",
    d: "Entraide entre candidats et annonces",
    url: "https://www.facebook.com/groups/2760698497636775",
    tone: "bg-[#1877F2]/10",
  },
  {
    key: "whatsapp",
    label: "Communauté WhatsApp",
    handle: "Rejoindre la communauté",
    d: "Sujets du mois et réponses rapides",
    url: "https://chat.whatsapp.com/KurRZ6cjCNE4caS3hdYo9D",
    tone: "bg-[#25D366]/10",
  },
];

// `sameAs` for the Organization structured data: the profiles Google uses to
// tie these accounts to the site's knowledge-graph entity. Always `url`, never
// `cta` — see the note on the YouTube entry.
export const SOCIAL_URLS = SOCIAL.map((s) => s.url);

// Where a follow link should point in the UI. One helper so the footer strip
// and the contact cards can never drift apart on this.
export const socialHref = (s) => s.cta || s.url;
