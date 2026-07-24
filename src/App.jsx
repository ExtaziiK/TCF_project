import { Analytics } from "@vercel/analytics/react";
import { AppProvider } from "@/context/AppProvider";
import { useApp } from "@/context/AppContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Onboarding } from "@/components/auth/Onboarding";
import { Toast } from "@/components/common";
import { ROLES } from "@/auth/rbac";
import { PAGES } from "@/pages";

function AppShell() {
  const { route, role, c, authReady, user, pendingOnboarding } = useApp();
  // A brand-new Google registration must finish creating its account before it
  // can reach any page — render the completion step as a full-screen gate.
  if (pendingOnboarding && user) {
    return (
      <div className={`min-h-screen font-body antialiased ${c.bg} ${c.text}`}>
        <Onboarding />
        <Toast />
      </div>
    );
  }
  // Sub-routes like "blog/<slug>" (individual articles) resolve to their base
  // page ("blog"); the page reads the full route to pick the article.
  const Page = PAGES[route] || PAGES[route.split("/")[0]] || PAGES.home;
  // The announcement bar is shown on every page to everyone who isn't a
  // paying/admin user — i.e. logged-out visitors and free accounts (Premium
  // and admin users don't need the promo). Gated on authReady so a Premium
  // user doesn't see the bar flash (and the layout jump 40px) while the
  // session is still loading. When it's hidden the fixed nav stays at top-0
  // with no reserved space; when it's shown, the nav (top-10) and the page
  // content (pt-10) shift down together by the bar's 40px height, preserving
  // each page's clearance.
  const showAnnounce = authReady && (role === ROLES.VISITOR || role === ROLES.FREE_USER);
  return (
    <div className={`min-h-screen font-body antialiased transition-colors duration-300 ${c.bg} ${c.text}`}>
      {showAnnounce && <AnnouncementBar />}
      <Nav barOffset={showAnnounce} />
      <div key={route} className={showAnnounce ? "pt-10" : undefined}><RouteGuard route={route}><Page /></RouteGuard></div>
      <Footer />
      <Toast />
      {/* Vercel Web Analytics — auto-tracks route changes via the History API;
          the numbers surface in the admin dashboard's "Trafic" tab. */}
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
