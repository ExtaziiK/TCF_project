import { useApp } from "@/context/AppContext";
import { ANNOUNCEMENTS } from "@/constants/announcements";

// Full-width infinite marquee pinned at the very top of the site, above the
// nav. The message list is rendered twice inside one track; the CSS animation
// slides the track by exactly one copy width (translateX 0 → -50%), so copy #2
// takes copy #1's place at the loop point — perfectly seamless, no jump or gap.
//
// - Hover or keyboard-focus pauses the scroll (CSS :hover / :focus-within).
// - prefers-reduced-motion stops the animation entirely (global rule in
//   index.css), leaving the messages static and readable.
// - Speed is driven by one CSS variable so it's trivial to tune; slower/faster
//   is just a bigger/smaller durationSec.
// - Reusable: drop <AnnouncementBar /> anywhere; content comes from the
//   ANNOUNCEMENTS config array.
export function AnnouncementBar({ durationSec = 40 }) {
  const { t } = useApp();
  if (!ANNOUNCEMENTS.length) return null;

  // One full pass of the messages. Rendered twice below; the duplicate is
  // hidden from assistive tech so screen readers announce each message once.
  const group = (duplicate) => (
    <ul className="marquee-group list-none" aria-hidden={duplicate || undefined}>
      {ANNOUNCEMENTS.map((msg, i) => (
        <li key={i} className="marquee-item text-xs sm:text-sm font-semibold tracking-wide">
          <span>{t(msg)}</span>
          <span className="marquee-sep" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="announce-bar fixed top-0 inset-x-0 z-40 h-10 grad-brand text-white flex items-center overflow-hidden"
      role="region"
      aria-label={t("Annonces")}
    >
      <div className="marquee-track" style={{ "--marquee-duration": `${durationSec}s` }}>
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}
