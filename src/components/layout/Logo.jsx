import { useApp } from "@/context/AppContext";
import { RouteLink } from "@/components/common/RouteLink";

// A real link to the homepage (crawlable, middle-click/new-tab friendly);
// `onNavigate` lets the caller close its menus after an in-app navigation.
//
// For staff the logo also opens the accueil as a signed-out visitor sees it.
// It used to land them on MemberHome — Home swaps in the member dashboard for
// anyone signed in — so the public landing page was unreachable without a
// private window, which is a poor way to check the page most of the traffic
// actually arrives on. The preview bar is the way back out.
export function Logo({ onNavigate }) {
  const { canPreviewAsVisitor, startVisitorPreview } = useApp();
  return (
    <RouteLink
      r="home"
      // Via onNavigate, not onClick: RouteLink spreads its rest props after its
      // own handler, so an onClick here would replace the one that keeps this a
      // SPA navigation. onNavigate also fires only on the intercepted plain
      // left-click — a ctrl/middle-click opens a real new tab, which loads the
      // app fresh and has no preview to inherit.
      onNavigate={() => { if (canPreviewAsVisitor) startVisitorPreview(); onNavigate?.(); }}
      className="flex items-center gap-2.5 group"
      aria-label={canPreviewAsVisitor ? "Passerelle — accueil (aperçu visiteur)" : "Passerelle — accueil"}
    >
      <img
        src="/logo-mark.png"
        alt=""
        width="48"
        height="48"
        className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
      />
      <span className="font-display font-bold text-lg leading-none">
        Passerelle<span className="block text-[10px] font-body font-semibold tracking-widest uppercase text-blue-600">TCF Canada</span>
      </span>
    </RouteLink>
  );
}
