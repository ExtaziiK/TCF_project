import { useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon, Bell, BellOff, Search, ChevronDown, ChevronRight, LogOut, Shield, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { Logo } from "@/components/layout/Logo";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { NAV_LINKS, navLinksForRole, mobileNavForRole } from "@/constants/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { ROLES, isStaff } from "@/auth/rbac";
import { currentPlanLabel } from "@/constants/pricing";
import { TOUR_STEPS } from "@/constants/tour";

// What fits in the nav chip: the first word only, capped at 9 characters.
// "Abdelkadir Mehri" was wide enough to push "Accueil" into the logo. The full
// name stays in the button's title, so nothing is lost that a hover cannot
// recover, and the stored profile name is untouched.
const CHIP_MAX = 9;
const chipName = (full) => {
  const first = String(full || "").trim().split(/\s+/)[0] || "";
  return first.length > CHIP_MAX ? `${first.slice(0, CHIP_MAX - 1)}…` : first;
};

// The routes behind "Pratique" (see NAV_LINKS in constants/navigation.js) —
// needed here because the mobile drawer has no single "Pratique" row to point
// at, so the tour step has to recognise its four children by route instead.
// They are contiguous in the drawer's "S'entraîner" section, so the tour's
// union rect lands on that group rather than on a scattered set of rows.
const PRATIQUE_ROUTES = ["vocabulary", "grammar", "conjugation", "dictee"];

// Below this width the mobile drawer is the one that renders (`xl:hidden`
// everywhere in this file), which is what the body-scroll lock keys off.
const XL = 1280;

export function Nav({ barOffset = false }) {
  const { c, dark, setDark, lang, setLang, t, nav, route, user, signOut, notify, role, profiles, activeProfile, switchProfile, maxProfiles, tourStep } = useApp();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // which dropdown is open (by label)
  // The guided tour force-opens "Pratique" for its step rather than waiting
  // on a real hover — see TourOverlay.jsx and constants/tour.js.
  const tourTarget = tourStep != null ? TOUR_STEPS[tourStep]?.target : null;
  const pratiqueForcedOpen = tourTarget === "nav-pratique";
  // Below xl the desktop nav (and its "Pratique" dropdown) is `hidden`, so a
  // nav-chrome tour step has nothing to spotlight unless the mobile panel is
  // open too. Forcing `open` here is harmless above xl — that panel stays
  // `xl:hidden` regardless, it just mounts with a zero rect the tour's own
  // measurement already filters out.
  useEffect(() => {
    if (tourTarget === "nav-exams" || tourTarget === "nav-pratique") setOpen(true);
  }, [tourTarget]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { notifications, unreadCount, markRead, dismiss, markAllRead } = useNotifications(user?.id, route);
  const notifRef = useRef(null);
  const closeAll = () => { setOpen(false); setOpenMenu(null); setNotifOpen(false); };
  const go = (r) => { nav(r); closeAll(); };

  // Close the notifications panel on an outside click or Escape.
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [notifOpen]);
  // Past the top of the page the bar sits over cards and photos, where a blur
  // alone leaves the muted link colour short of contrast — fade a translucent
  // fill in behind it. The state only flips at the threshold, not every frame.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Escape closes the drawer, and the page behind it stops scrolling: a phone
  // has no visible scrollbar, so a swipe meant for the menu used to drag the
  // page underneath instead and the menu appeared to slide away on its own.
  //
  // Keyed on the width at open time rather than on `open` alone, because the
  // guided tour force-opens the drawer at every width (see the effect above).
  // Above xl the drawer is `xl:hidden` and nothing is covering the page, so
  // locking the body there would freeze the tour's own scrolling for no reason.
  useEffect(() => {
    if (!open || window.innerWidth >= XL) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const navLinks = navLinksForRole(NAV_LINKS, role);
  const mobileGroups = mobileNavForRole(role);
  // The identity line at the top of the drawer. The desktop nav shows plan and
  // name in a chip that is `hidden md:flex`, so on an actual phone there was
  // nowhere at all to see which account — or which plan — you were signed in
  // with. Free accounts get a label too, where the chip showed nothing: it is
  // the honest place to tell someone why half the site is locked.
  const planBadge = !user ? null
    : role === ROLES.OWNER ? { l: "Owner", cls: "text-amber-600" }
    : role === ROLES.ADMIN ? { l: "Admin", cls: "text-rose-600" }
    : role === ROLES.PREMIUM_USER ? { l: currentPlanLabel(user.planLabel) || "Premium", cls: "text-blue-600" }
    : { l: t("Compte gratuit"), cls: c.faint };
  return (
    <>
      {/* At the top of the page the bar is fully transparent so the hero shows
          through and the links/buttons read as free-floating. Once the page
          scrolls (or the mobile menu opens) a translucent fill and hairline
          border fade in to keep them legible over content. The border is always
          present but transparent, so fading it in costs no layout shift. */}
      <header className={`fixed ${barOffset ? "top-10" : "top-0"} inset-x-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${scrolled || open ? `${c.nav} ${c.navBorder}` : "bg-transparent border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-3">
          <Logo onNavigate={closeAll} />
          <nav className="hidden xl:flex items-center gap-1" aria-label={t("Navigation principale")}>
            {navLinks.map((n) => {
              const isPratique = n.l === "Pratique";
              const pratiqueOpen = openMenu === n.l || (isPratique && pratiqueForcedOpen);
              return n.menu ? (
                <div key={n.l} className="relative" data-tour={isPratique ? "nav-pratique" : undefined} onMouseEnter={() => setOpenMenu(n.l)} onMouseLeave={() => setOpenMenu(null)}>
                  <button className={`px-3.5 py-2 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap shrink-0 ${c.sub} ${c.hoverSoft}`} aria-expanded={pratiqueOpen}>
                    {t(n.l)} <ChevronDown size={14} className={`transition-transform ${pratiqueOpen ? "rotate-180" : ""}`} />
                  </button>
                  {pratiqueOpen && (
                    <div className={`absolute top-full left-0 pt-2 w-60`}>
                      {/* Also tagged nav-pratique: a position:relative wrapper's
                          own rect doesn't grow to include this absolutely
                          positioned panel, so the tour needs both boxes to
                          spotlight the trigger AND the open menu together —
                          see the union logic in TourOverlay's useTourTarget. */}
                      <div data-tour={isPratique ? "nav-pratique" : undefined} className={`rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise`}>
                        {n.menu.map((m) => (
                          <RouteLink key={m.r + m.l} r={m.r} onNavigate={closeAll} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm ${c.text} ${c.hoverSoft} flex items-center justify-between group`}>
                            {t(m.l)}<ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                          </RouteLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : n.grad ? (
                <RouteLink key={n.r} r={n.r} onNavigate={closeAll} data-tour={n.r === "exams" ? "nav-exams" : undefined} aria-current={route === n.r ? "page" : undefined} className={`px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 ${route === n.r ? "bg-blue-600/10" : c.hoverSoft}`}>
                  <span className="grad-text">{t(n.l)}</span>
                </RouteLink>
              ) : (
                <RouteLink key={n.r} r={n.r} onNavigate={closeAll} data-tour={n.r === "exams" ? "nav-exams" : undefined} aria-current={route === n.r ? "page" : undefined} className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${route === n.r ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}>{t(n.l)}</RouteLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            {isStaff(role) && (
              <button onClick={() => setSearchOpen(true)} aria-label={t("Rechercher")} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><Search size={18} /></button>
            )}
            <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} aria-label={lang === "fr" ? "Switch to English" : "Passer au français"} className={`p-2.5 rounded-full text-xs font-bold tracking-wide ${c.sub} ${c.hoverSoft}`}>{lang === "fr" ? "EN" : "FR"}</button>
            <button onClick={() => setDark(!dark)} aria-label={dark ? t("Mode clair") : t("Mode sombre")} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user && (
              <div className="relative" ref={notifRef}>
                <button onClick={() => setNotifOpen((o) => !o)} aria-label={t("Notifications")} aria-expanded={notifOpen} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft} relative`}>
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise z-50`}>
                    <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
                      <p className={`text-xs font-bold uppercase tracking-wider ${c.faint}`}>Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:underline">{t("Tout marquer comme lu")}</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <BellOff size={22} className={`mx-auto mb-2 ${c.faint}`} />
                        <p className={`text-sm ${c.faint}`}>{t("Aucune notification")}</p>
                      </div>
                    ) : (
                      <div className="max-h-[22rem] overflow-y-auto">
                        {notifications.map((nf) => (
                          <div key={nf.id} className={`group flex gap-3 px-3 py-3 rounded-xl ${c.hoverSoft} ${nf.read ? "" : "bg-blue-600/5"}`}>
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${nf.read ? `${c.tint} ${c.faint}` : "bg-blue-600/10 text-blue-600"}`}><nf.icon size={16} /></span>
                            {/* Some notifications lead somewhere (an answer
                                from the team lives on the profile page); the
                                rest are read in place, as before. */}
                            <button onClick={() => { markRead(nf.id); if (nf.route) go(nf.route); }} className="flex-1 min-w-0 text-left">
                              <p className={`text-sm ${c.text}`}>{t(nf.t)}</p>
                              <p className={`text-xs ${c.faint} mt-0.5`}>{t(nf.time)}</p>
                            </button>
                            <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                              {!nf.read && <span className="w-2 h-2 rounded-full bg-blue-600" aria-label={t("Non lu")} />}
                              <button onClick={() => dismiss(nf.id)} aria-label={t("Supprimer")} className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg ${c.faint} ${c.hoverSoft} transition-opacity`}><X size={13} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {user ? (
              <div className="hidden md:flex items-center gap-2 ml-1 shrink-0">
                {isStaff(role) && (
                  <button onClick={() => go("admin")} aria-label={t("Administration")} className={`p-2.5 rounded-full shrink-0 ${route === "admin" ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}><Shield size={18} /></button>
                )}
                <button onClick={() => go("profile")} aria-label={t("Mon profil")} title={activeProfile?.name || user.name} className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border shrink-0 ${c.border} ${c.hoverSoft}`}>
                  <span className="w-7 h-7 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center shrink-0">{(activeProfile?.name || user.name)[0]}</span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className={`text-sm font-semibold whitespace-nowrap ${c.text}`}>{chipName(activeProfile?.name || user.name)}</span>
                    {role === ROLES.OWNER ? <span className="text-[10px] font-bold text-amber-600">Owner</span>
                      : role === ROLES.ADMIN ? <span className="text-[10px] font-bold text-rose-600">Admin</span>
                      : role === ROLES.PREMIUM_USER ? <span className="text-[10px] font-bold text-blue-600">{currentPlanLabel(user.planLabel) || "Premium"}</span>
                      : null}
                  </span>
                </button>
                {(maxProfiles > 1 || profiles.length > 1) && (
                  <button onClick={switchProfile} aria-label={t("Changer de profil")} title={t("Changer de profil")} className={`p-2.5 rounded-full shrink-0 ${c.sub} ${c.hoverSoft}`}><Users size={17} /></button>
                )}
                <button onClick={() => { signOut(); go("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); }} aria-label={t("Se déconnecter")} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><LogOut size={17} /></button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Btn small variant="ghost" onClick={() => go("login")}>{t("Connexion")}</Btn>
                <Btn small onClick={() => go("register")}>{t("S'inscrire")}</Btn>
              </div>
            )}
            <button onClick={() => setOpen(!open)} aria-label={open ? t("Fermer le menu") : "Menu"} aria-expanded={open} aria-controls="mobile-nav" className={`xl:hidden p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" className={`xl:hidden border-t ${c.navBorder} ${c.card} max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rise`}>
            <div className="px-4 py-4 space-y-5">
              {/* Who you are, or how to become someone — first thing in the
                  drawer either way. For a visitor the two buttons are the whole
                  point of the menu, and they used to sit under fourteen links
                  where a phone screen could not reach them without scrolling. */}
              {user ? (
                <div className="flex items-center gap-2">
                  <RouteLink r="profile" onNavigate={closeAll} className={`flex-1 min-w-0 flex items-center gap-3 p-2 rounded-2xl border ${c.border} ${c.hoverSoft}`}>
                    <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center shrink-0">{(activeProfile?.name || user.name)[0]}</span>
                    <span className="min-w-0 leading-tight">
                      <span className={`block text-sm font-semibold truncate ${c.text}`}>{activeProfile?.name || user.name}</span>
                      <span className={`block text-[11px] font-bold ${planBadge.cls}`}>{planBadge.l}</span>
                    </span>
                  </RouteLink>
                  {(maxProfiles > 1 || profiles.length > 1) && (
                    <button onClick={() => { setOpen(false); switchProfile(); }} aria-label={t("Changer de profil")} title={t("Changer de profil")} className={`p-3 rounded-2xl border shrink-0 ${c.border} ${c.sub} ${c.hoverSoft}`}><Users size={18} /></button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Btn small variant="ghost" onClick={() => go("login")}>{t("Connexion")}</Btn>
                  <Btn small onClick={() => go("register")}>{t("S'inscrire")}</Btn>
                </div>
              )}
              {mobileGroups.map((g) => (
                <div key={g.id}>
                  {g.l && <p className={`px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider ${c.faint}`}>{t(g.l)}</p>}
                  <div className="space-y-0.5">
                    {g.items.map((m) => {
                      const active = route === m.r;
                      const Icon = m.icon;
                      return (
                        <RouteLink key={m.r} r={m.r} onNavigate={closeAll}
                          // All four "Pratique" routes share the nav-pratique
                          // tag (see PRATIQUE_ROUTES above); the tour's
                          // union-rect measurement spotlights the group.
                          data-tour={m.r === "exams" ? "nav-exams" : PRATIQUE_ROUTES.includes(m.r) ? "nav-pratique" : undefined}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl ${active ? "bg-blue-600/10" : c.hoverSoft}`}>
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-blue-600 text-white" : `${c.tint} ${c.sub}`}`}>
                            {Icon && <Icon size={17} />}
                          </span>
                          {/* An active gradient label would be unreadable
                              against the blue tint, so the highlight wins and
                              the gradient steps aside for that one row. */}
                          <span className={`flex-1 text-[15px] ${m.grad ? "font-bold" : "font-medium"} ${active ? "text-blue-600" : c.text}`}>
                            {m.grad && !active ? <span className="grad-text">{t(m.l)}</span> : t(m.l)}
                          </span>
                          <ChevronRight size={15} className={c.faint} />
                        </RouteLink>
                      );
                    })}
                  </div>
                </div>
              ))}
              {user && (
                <Btn small variant="ghost" className="w-full" onClick={() => { signOut(); go("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); }}>{t("Se déconnecter")}</Btn>
              )}
            </div>
          </div>
        )}
      </header>
      {/* Tapping the page closes the drawer — the reflex on a phone, where the
          only way out before was reaching back up to the X. Rendered outside
          the header so it sits *below* it (z-30 against the header's z-40) and
          the drawer itself stays clickable on top. */}
      {open && (
        <button type="button" aria-label={t("Fermer le menu")} onClick={() => setOpen(false)}
          className="xl:hidden fixed inset-0 z-30 bg-slate-950/30 cursor-default" />
      )}
      {searchOpen && isStaff(role) && <SearchOverlay close={() => setSearchOpen(false)} />}
    </>
  );
}
