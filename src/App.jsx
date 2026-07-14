import { AppProvider } from "@/context/AppProvider";
import { useApp } from "@/context/AppContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Toast } from "@/components/common";
import { ROLES } from "@/auth/rbac";
import { PAGES } from "@/pages";

function AppShell() {
  const { route, role, c } = useApp();
  const Page = PAGES[route] || PAGES.home;
  // The announcement bar is shown only on the Accueil (home) page, to everyone
  // who isn't a paying/admin user — i.e. logged-out visitors and free accounts
  // (Premium and admin users don't need the promo). When it's hidden the fixed
  // nav stays at top-0 with no reserved space; when it's shown, the nav (top-10)
  // and the page content (pt-10) shift down together by the bar's 40px height,
  // preserving each page's clearance.
  const showAnnounce = route === "home" && (role === ROLES.VISITOR || role === ROLES.FREE_USER);
  return (
    <div className={`min-h-screen font-body antialiased transition-colors duration-300 ${c.bg} ${c.text}`}>
      {showAnnounce && <AnnouncementBar />}
      <Nav barOffset={showAnnounce} />
      <div key={route} className={showAnnounce ? "pt-10" : undefined}><RouteGuard route={route}><Page /></RouteGuard></div>
      <Footer />
      <Toast />
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
