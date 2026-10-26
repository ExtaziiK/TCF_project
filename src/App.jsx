import { Analytics } from "@vercel/analytics/react";
import { AppProvider } from "@/context/AppProvider";
import { useApp } from "@/context/AppContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { useAnnouncementBar } from "@/hooks/useAnnouncementBar";
import { hasStoredSession } from "@/services/supabaseClient";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { VisitorPreviewBar } from "@/components/layout/VisitorPreviewBar";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Onboarding } from "@/components/auth/Onboarding";
import { TermsGate } from "@/components/auth/TermsGate";
import { ProfileGate } from "@/components/profile/ProfileGate";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { Toast } from "@/components/common";
import { useTermsGate } from "@/hooks/useTermsGate";
import { ROLES } from "@/auth/rbac";
import { PAGES } from "@/pages";
import { PRATIQUE_ROUTES } from "@/constants/navigation";

function AppShell() {
  const { route, role, c, authReady, user, needsProfile, resolvingOAuth, authScreen,
    profiles, activeProfile, profilesReady, canAddProfile, selectProfile, profileAdded } = useApp();
  const terms = useTermsGate();
  const bar = useAnnouncementBar();
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
  // and admin users don't need the promo) — and only while the admin has it
  // on. When it's hidden the fixed nav stays at top-0 with no reserved space;
  // when it's shown, the nav (top-10) and the page content (pt-10) shift down
  // together by the bar's 40px height, preserving each page's clearance.
  //
  // Before the session is known, a browser with no saved session is a visitor:
  // laying the bar out on the first frame for them avoids a 40px jump of the
  // whole page when auth resolves (it counted towards PageSpeed's CLS). A saved
  // session waits for its role, so a Premium user never sees the bar flash.
  const barAudience = authReady ? role === ROLES.VISITOR || role === ROLES.FREE_USER : !hasStoredSession();
  // The log-in and sign-up form stands alone, like a checkout: no navbar and
  // no announcement bar, only its own "Accueil" button. That holds on its two
  // routes (known before the lazy page even loads) and wherever else it shows
  // — a members-only page after a sign-out, which AuthPage reports.
  const authPage = route === "login" || route === "register" || authScreen;
  const showAnnounce = !authPage && barAudience && bar.enabled && bar.messages.length > 0;
  // The page remounts on route change (key), except between the six practice
  // routes: they are tabs of one page, the Pratique hub, which keeps its state.
  return (
    <div className={`min-h-screen font-body antialiased transition-colors duration-300 ${c.bg} ${c.text}`}>
      {showAnnounce && <AnnouncementBar messages={bar.messages} />}
      {!authPage && <Nav barOffset={showAnnounce} />}
      <div key={PRATIQUE_ROUTES.has(route) ? "pratique" : route} className={showAnnounce ? "pt-10" : undefined}><RouteGuard route={route}><Page /></RouteGuard></div>
      {/* The log-in and sign-up pages stand alone: no footer either (its top
          margin showed as a strip under their full-height panel). */}
      {!authPage && <Footer />}
      <VisitorPreviewBar />
      {/* A new account finishing its profile: a popup over the dashboard. */}
      {needsProfile && <Onboarding />}
      <Toast />
      <TourOverlay />
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
