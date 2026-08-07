import { Analytics } from "@vercel/analytics/react";
import { AppProvider } from "@/context/AppProvider";
import { useApp } from "@/context/AppContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { VisitorPreviewBar } from "@/components/layout/VisitorPreviewBar";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Onboarding } from "@/components/auth/Onboarding";
import { TermsGate } from "@/components/auth/TermsGate";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { Toast } from "@/components/common";
import { useTermsGate } from "@/hooks/useTermsGate";
import { ROLES } from "@/auth/rbac";
import { PAGES } from "@/pages";

function AppShell() {
  const { route, role, c, authReady, user, pendingOnboarding, resolvingOAuth,
    profiles, activeProfile, profilesReady, canAddProfile, selectProfile, profileAdded } = useApp();
  const terms = useTermsGate();
  // Returning from a Google redirect: hold a "signing in…" splash until the
  // session is resolved, so we never flash signed-in UI (e.g. the dashboard)
  // during the reject/claim network calls before a decision is made.
  if (resolvingOAuth) {
    return (
      <div className={`min-h-screen grid place-items-center font-body antialiased ${c.bg} ${c.text}`}>
        <div className="flex flex-col items-center gap-4">
          <span className="w-9 h-9 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" aria-hidden="true" />
          <p className={`text-sm ${c.sub}`}>Connexion en cours…</p>
        </div>
      </div>
    );
  }
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
  // Published conditions newer than what this account accepted: the same kind of
  // gate, so the app is only reachable once the new text has been accepted (or
  // the user signs out). Never triggers while the check is unanswered.
  if (terms.blocked && user) {
    return (
      <div className={`min-h-screen font-body antialiased ${c.bg} ${c.text}`}>
        <TermsGate onAccepted={terms.clear} />
        <Toast />
      </div>
    );
  }
  // Several candidates share a Première classe or VIP pass. Which one is
  // sitting down decides whose progression this session reads and writes, so it
  // is settled before any page renders. Accounts with a single unlocked profile
  // never reach here — useProfiles selects it silently — and neither does an
  // account whose profiles could not be read, so a missing migration locks
  // nobody out.
  if (user && profilesReady && profiles.length > 0 && !activeProfile) {
    return (
      <div className={`min-h-screen font-body antialiased ${c.bg} ${c.text}`}>
        <ProfileGate
          profiles={profiles}
          canAdd={canAddProfile}
          onPick={selectProfile}
          onCreated={profileAdded}
        />
        <Toast />
      </div>
    );
  }
  // Sub-routes like "blog/<slug>" (individual articles) resolve to their base
  // page ("blog"); the page reads the full route to pick the article. Anything
  // with no page at all falls to the 404 rather than to the homepage.
  const Page = PAGES[route] || PAGES[route.split("/")[0]] || PAGES.notfound;
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
      <VisitorPreviewBar />
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
