import { useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon, Bell, BellOff, Search, ChevronDown, ChevronRight, LogOut, Shield, Users, BadgeCheck, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { Logo } from "@/components/layout/Logo";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { NAV_LINKS, navLinksForRole, mobileNavForRole, PRATIQUE_ROUTES as HUB_ROUTES } from "@/constants/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { usePendingValidations } from "@/hooks/usePendingValidations";
import { ROLES, isStaff } from "@/auth/rbac";
import { currentPlanLabel } from "@/constants/pricing";
import { TOUR_STEPS } from "@/constants/tour";

// The navigation is a floating "island": a rounded bar set a little below the
// top of the screen, translucent with a hairline border (and a soft shadow
// once the page scrolls). The links sit in a pale segmented track where the
// current page is a white pill; utilities (search, language, theme,
// notifications) share one compact pill; and the account is a single avatar
// button opening a menu (profile, admin, validation, profile switch, sign-out).
// Below xl, the links move to a drawer that opens as a card under the island.

// What fits next to the avatar: the first word only, capped at 9 characters.
// The full name stays in the button's title and in the account menu.
const CHIP_MAX = 9;
const chipName = (full) => {
  const first = String(full || "").trim().split(/\s+/)[0] || "";
  return first.length > CHIP_MAX ? `${first.slice(0, CHIP_MAX - 1)}…` : first;
};

// The routes behind "Pratique" (see NAV_LINKS in constants/navigation.js) —
// needed here because the mobile drawer has no single "Pratique" row to point
// at, so the tour step has to recognise its children by route instead. They
// are contiguous in the drawer's "S'entraîner" section, so the tour's union
// rect lands on that group rather than on a scattered set of rows.
const PRATIQUE_ROUTES = ["vocabulary", "grammar", "conjugation", "dictee"];

// Below this width the mobile drawer is the one that renders (`xl:hidden`
// everywhere in this file), which is what the body-scroll lock keys off.
const XL = 1280;

// Closes a popover on an outside click or Escape.
function useDismiss(open, ref, close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, ref, close]);
}

function CountBadge({ n, className = "" }) {
  if (!n) return null;
  return (
    <span className={`min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none flex items-center justify-center ${className}`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

export function Nav({ barOffset = false }) {
  const { c, dark, setDark, lang, setLang, t, nav, route, user, signOut, notify, role, profiles, activeProfile, switchProfile, maxProfiles, tourStep } = useApp();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // which dropdown is open (by label)
  // The guided tour force-opens "Pratique" for its step rather than waiting
  // on a real hover — see TourOverlay.jsx and constants/tour.js.
  const tourTarget = tourStep != null ? TOUR_STEPS[tourStep]?.target : null;
  const pratiqueForcedOpen = tourTarget === "nav-pratique";
  // Below xl the desktop links are `hidden`, so a nav-chrome tour step has
  // nothing to spotlight unless the drawer is open too. Forcing `open` is
  // harmless above xl — the drawer stays `xl:hidden` regardless, it just mounts
  // with a zero rect the tour's own measurement already filters out.
  useEffect(() => {
    if (tourTarget === "nav-exams" || tourTarget === "nav-pratique") setOpen(true);
  }, [tourTarget]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { notifications, unreadCount, markRead, dismiss, markAllRead } = useNotifications(user?.id, route);
  // Requests waiting for the validateur, shown on the avatar and in its menu.
  const pendingValidations = usePendingValidations(!!user?.moderator);
  const notifRef = useRef(null);
  const accountRef = useRef(null);
  const closeAll = () => { setOpen(false); setOpenMenu(null); setNotifOpen(false); setAccountOpen(false); };
  const go = (r) => { nav(r); closeAll(); };
  const logout = () => { signOut(); go("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); };

  useDismiss(notifOpen, notifRef, () => setNotifOpen(false));
  useDismiss(accountOpen, accountRef, () => setAccountOpen(false));

  // Past the top of the page the island gains a soft shadow, so it reads as
  // floating above the content. The state only flips at the threshold.
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
  const mobileGroups = mobileNavForRole(role, user);
  const name = user ? (activeProfile?.name || user.name) : "";
  // The account's plan, shown in the account menu and at the top of the drawer.
  // Free accounts get a label too: it is the honest place to say why half the
  // site is locked.
  const planBadge = !user ? null
    : role === ROLES.OWNER ? { l: "Owner", cls: "text-amber-600" }
    : role === ROLES.ADMIN ? { l: "Admin", cls: "text-rose-600" }
    : user.moderator ? { l: t("Validateur"), cls: "text-emerald-600" }
    : role === ROLES.PREMIUM_USER ? { l: currentPlanLabel(user.planLabel) || "Premium", cls: "text-blue-600" }
    : { l: t("Compte gratuit"), cls: c.faint };
  const track = dark ? "bg-slate-800/70" : "bg-slate-100";
  const pill = dark ? "bg-slate-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm";
  const iconBtn = `p-2 rounded-full ${c.sub} ${c.hoverSoft}`;
  const canSwitch = maxProfiles > 1 || profiles.length > 1;

  return (
    <>
      <header className={`fixed ${barOffset ? "top-10" : "top-0"} inset-x-0 z-40 px-3 sm:px-4 pt-2.5 md:pt-3`}>
        <div className={`max-w-7xl mx-auto h-14 md:h-[60px] pl-4 pr-2 sm:pl-5 rounded-full border backdrop-blur-xl flex items-center justify-between gap-3 transition-shadow duration-300
          ${c.nav} ${c.navBorder} ${scrolled || open ? "shadow-lg shadow-slate-900/[0.07]" : ""}`}>
          <Logo onNavigate={closeAll} />

          {/* Links: a segmented track, the current page as a white pill. */}
          <nav className={`hidden xl:flex items-center gap-0.5 p-1 rounded-full ${track}`} aria-label={t("Navigation principale")}>
            {navLinks.map((n) => {
              const isPratique = n.l === "Pratique";
              const pratiqueOpen = openMenu === n.l || (isPratique && pratiqueForcedOpen);
              const base = "px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 transition-colors";
              // A menu entry without a route of its own keeps a dropdown; one with
              // a route (« Pratique ») is a plain link, active on any of its tools.
              if (n.menu && !n.r) {
                return (
                  <div key={n.l} className="relative" data-tour={isPratique ? "nav-pratique" : undefined} onMouseEnter={() => setOpenMenu(n.l)} onMouseLeave={() => setOpenMenu(null)}>
                    <button className={`${base} font-medium flex items-center gap-1 ${c.sub} hover:text-blue-600`} aria-expanded={pratiqueOpen}>
                      {t(n.l)} <ChevronDown size={14} className={`transition-transform ${pratiqueOpen ? "rotate-180" : ""}`} />
                    </button>
                    {pratiqueOpen && (
                      <div className="absolute top-full left-0 pt-3 w-60">
                        {/* Also tagged nav-pratique: the wrapper's rect doesn't
                            include this absolutely positioned panel, so the tour
                            needs both boxes (TourOverlay's union logic). */}
                        <div data-tour={isPratique ? "nav-pratique" : undefined} className={`rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise`}>
                          {n.menu.map((m) => m.soon ? (
                            <div key={m.r + m.l} aria-disabled="true" title={t("Bientôt disponible")} className={`w-full px-3.5 py-2.5 rounded-xl text-sm ${c.sub} opacity-60 cursor-not-allowed flex items-center justify-between`}>
                              {t(m.l)}<span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{t("Bientôt")}</span>
                            </div>
                          ) : (
                            <RouteLink key={m.r + m.l} r={m.r} onNavigate={closeAll} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm ${c.text} ${c.hoverSoft} flex items-center justify-between group`}>
                              {t(m.l)}<ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                            </RouteLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              const here = route === n.r || (isPratique && HUB_ROUTES.has(route));
              return (
                <RouteLink key={n.r} r={n.r} onNavigate={closeAll}
                  data-tour={n.r === "exams" ? "nav-exams" : isPratique ? "nav-pratique" : undefined}
                  aria-current={here ? "page" : undefined}
                  className={`${base} ${n.grad ? "font-bold" : "font-medium"} ${here ? pill : `${c.sub} hover:text-blue-600`}`}>
                  {n.grad ? <span className="grad-text">{t(n.l)}</span> : t(n.l)}
                </RouteLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            {/* Utilities, grouped in one compact pill. */}
            <div className={`flex items-center rounded-full ${track} p-0.5`}>
              {isStaff(role) && (
                <button onClick={() => setSearchOpen(true)} aria-label={t("Rechercher")} className={iconBtn}><Search size={17} /></button>
              )}
              <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} aria-label={lang === "fr" ? "Switch to English" : "Passer au français"}
                className={`${iconBtn} text-[11px] font-bold tracking-wide w-9`}>{lang === "fr" ? "EN" : "FR"}</button>
              <button onClick={() => setDark(!dark)} aria-label={dark ? t("Mode clair") : t("Mode sombre")} className={iconBtn}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
              {user && (
                <div className="relative" ref={notifRef}>
                  <button onClick={() => { setNotifOpen((o) => !o); setAccountOpen(false); }} aria-label={t("Notifications")} aria-expanded={notifOpen} className={`${iconBtn} relative`}>
                    <Bell size={17} />
                    <CountBadge n={unreadCount} className="absolute -top-0.5 -right-0.5" />
                  </button>
                  {notifOpen && (
                    <div className={`absolute right-0 top-full mt-3 w-80 rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise z-50`}>
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
                              {/* Some notifications lead somewhere (an answer from
                                  the team lives on the profile page); the rest
                                  are read in place. */}
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
            </div>

            {/* The account: one avatar button and its menu. */}
            {user ? (
              <div className="relative hidden md:block" ref={accountRef}>
                <button onClick={() => { setAccountOpen((o) => !o); setNotifOpen(false); }} aria-label={t("Mon compte")} aria-expanded={accountOpen} title={name}
                  className={`relative flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border ${c.border} ${c.card} ${c.hoverSoft}`}>
                  <span className="w-8 h-8 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center shrink-0">{name[0]}</span>
                  <span className={`text-sm font-semibold whitespace-nowrap ${c.text}`}>{chipName(name)}</span>
                  <ChevronDown size={14} className={`${c.faint} transition-transform ${accountOpen ? "rotate-180" : ""}`} />
                  <CountBadge n={pendingValidations} className="absolute -top-1 -right-1" />
                </button>
                {accountOpen && (
                  <div className={`absolute right-0 top-full mt-3 w-64 rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise z-50`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center shrink-0">{name[0]}</span>
                      <span className="min-w-0 leading-tight">
                        <span className={`block text-sm font-semibold truncate ${c.text}`}>{name}</span>
                        <span className={`block text-[11px] font-bold ${planBadge.cls}`}>{planBadge.l}</span>
                      </span>
                    </div>
                    <div className={`my-1 border-t ${c.border}`} />
                    {[
                      { icon: User, l: t("Mon profil"), on: () => go("profile"), here: route === "profile" },
                      isStaff(role) && { icon: Shield, l: t("Administration"), on: () => go("admin"), here: route === "admin" },
                      user.moderator && { icon: BadgeCheck, l: t("Validation"), on: () => go("moderation"), here: route === "moderation", badge: pendingValidations },
                      canSwitch && { icon: Users, l: t("Changer de profil"), on: () => { closeAll(); switchProfile(); } },
                    ].filter(Boolean).map((it) => (
                      <button key={it.l} onClick={it.on} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left ${it.here ? "text-blue-600 bg-blue-600/10" : `${c.text} ${c.hoverSoft}`}`}>
                        <it.icon size={16} className={it.here ? "" : c.faint} /> <span className="flex-1">{it.l}</span>
                        <CountBadge n={it.badge} />
                      </button>
                    ))}
                    <div className={`my-1 border-t ${c.border}`} />
                    <button onClick={logout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-rose-600 ${c.hoverSoft}`}>
                      <LogOut size={16} /> {t("Se déconnecter")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Btn small variant="ghost" onClick={() => go("login")}>{t("Connexion")}</Btn>
                <Btn small onClick={() => go("register")}>{t("S'inscrire")}</Btn>
              </div>
            )}

            <button onClick={() => setOpen(!open)} aria-label={open ? t("Fermer le menu") : "Menu"} aria-expanded={open} aria-controls="mobile-nav"
              className={`xl:hidden p-2.5 rounded-full ${open ? pill : `${c.sub} ${c.hoverSoft}`}`}>{open ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
        </div>

        {/* The drawer: a card under the island. */}
        {open && (
          <div id="mobile-nav" className={`xl:hidden max-w-7xl mx-auto mt-2 rounded-3xl border ${c.navBorder} ${c.card} shadow-2xl max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain rise`}>
            <div className="px-4 py-4 space-y-5">
              {/* Who you are, or how to become someone — first thing in the
                  drawer either way. */}
              {user ? (
                <div className="flex items-center gap-2">
                  <RouteLink r="profile" onNavigate={closeAll} className={`flex-1 min-w-0 flex items-center gap-3 p-2 rounded-2xl border ${c.border} ${c.hoverSoft}`}>
                    <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center shrink-0">{name[0]}</span>
                    <span className="min-w-0 leading-tight">
                      <span className={`block text-sm font-semibold truncate ${c.text}`}>{name}</span>
                      <span className={`block text-[11px] font-bold ${planBadge.cls}`}>{planBadge.l}</span>
                    </span>
                  </RouteLink>
                  {canSwitch && (
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
                      if (m.soon) return (
                        <div key={m.r} aria-disabled="true" title={t("Bientôt disponible")} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl opacity-60 cursor-not-allowed">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.tint} ${c.sub}`}>{Icon && <Icon size={17} />}</span>
                          <span className={`flex-1 text-[15px] font-medium ${c.sub}`}>{t(m.l)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{t("Bientôt")}</span>
                        </div>
                      );
                      return (
                        <RouteLink key={m.r} r={m.r} onNavigate={closeAll}
                          // All "Pratique" routes share the nav-pratique tag (see
                          // PRATIQUE_ROUTES above); the tour spotlights the group.
                          data-tour={m.r === "exams" ? "nav-exams" : PRATIQUE_ROUTES.includes(m.r) ? "nav-pratique" : undefined}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl ${active ? "bg-blue-600/10" : c.hoverSoft}`}>
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-blue-600 text-white" : `${c.tint} ${c.sub}`}`}>
                            {Icon && <Icon size={17} />}
                          </span>
                          {/* An active gradient label would be unreadable against
                              the blue tint, so the highlight wins for that row. */}
                          <span className={`flex-1 text-[15px] ${m.grad ? "font-bold" : "font-medium"} ${active ? "text-blue-600" : c.text}`}>
                            {m.grad && !active ? <span className="grad-text">{t(m.l)}</span> : t(m.l)}
                          </span>
                          {m.r === "moderation" && <CountBadge n={pendingValidations} className="!min-w-[20px] !h-5 !text-[11px]" />}
                          <ChevronRight size={15} className={c.faint} />
                        </RouteLink>
                      );
                    })}
                  </div>
                </div>
              ))}
              {user && (
                <Btn small variant="ghost" className="w-full" onClick={logout}>{t("Se déconnecter")}</Btn>
              )}
            </div>
          </div>
        )}
      </header>
      {/* Tapping the page closes the drawer. Rendered outside the header so it
          sits below it (z-30 against the header's z-40). */}
      {open && (
        <button type="button" aria-label={t("Fermer le menu")} onClick={() => setOpen(false)}
          className="xl:hidden fixed inset-0 z-30 bg-slate-950/30 cursor-default" />
      )}
      {searchOpen && isStaff(role) && <SearchOverlay close={() => setSearchOpen(false)} />}
    </>
  );
}
