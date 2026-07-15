import { RouteLink } from "@/components/common/RouteLink";

// A real link to the homepage (crawlable, middle-click/new-tab friendly);
// `onNavigate` lets the caller close its menus after an in-app navigation.
export function Logo({ onNavigate }) {
  return (
    <RouteLink r="home" onNavigate={onNavigate} className="flex items-center gap-2.5 group" aria-label="Passerelle — accueil">
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
