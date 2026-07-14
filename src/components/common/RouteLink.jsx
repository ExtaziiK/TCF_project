import { useApp } from "@/context/AppContext";
import { pathForRoute } from "@/constants/seo";

// Internal navigation rendered as a real <a href>: crawlers discover every
// route's URL from the markup and users keep native link affordances (open in
// a new tab, copy the address, hover preview). A plain left-click is
// intercepted and routed through the SPA's nav() — no full reload; modified
// clicks (ctrl/cmd/shift/middle) fall through to the browser.
export function RouteLink({ r, replace, onNavigate, children, ...rest }) {
  const { nav } = useApp();
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    nav(r, { replace });
    onNavigate?.();
  };
  return (
    <a href={pathForRoute(r)} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
