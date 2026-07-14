import { useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon, Bell, BellOff, Search, ChevronDown, ChevronRight, LogOut, Shield } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { Logo } from "@/components/layout/Logo";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { NAV_LINKS, ACCOUNT_LINKS, navLinksForRole } from "@/constants/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { ROLES } from "@/auth/rbac";

export function Nav({ barOffset = false }) {
  const { c, dark, setDark, lang, setLang, t, nav, route, user, signOut, notify, role } = useApp();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // which dropdown is open (by label)
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
  const navLinks = navLinksForRole(NAV_LINKS, role);
  const accountLinks = navLinksForRole(ACCOUNT_LINKS, role);
  const mobileLinks = [
    ...navLinks.flatMap((n) => (n.menu ? n.menu : [n])),
    ...accountLinks,
    { l: "Contact", r: "contact" },
  ];
  return (
    <>
      <header className={`fixed ${barOffset ? "top-10" : "top-0"} inset-x-0 z-40 border-b ${c.navBorder} ${c.nav} backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-3">
          <Logo onNavigate={closeAll} />
          <nav className="hidden lg:flex items-center gap-1" aria-label={t("Navigation principale")}>
            {navLinks.map((n) =>
              n.menu ? (
                <div key={n.l} className="relative" onMouseEnter={() => setOpenMenu(n.l)} onMouseLeave={() => setOpenMenu(null)}>
                  <button className={`px-3.5 py-2 rounded-full text-sm font-medium flex items-center gap-1 ${c.sub} ${c.hoverSoft}`} aria-expanded={openMenu === n.l}>
                    {t(n.l)} <ChevronDown size={14} className={`transition-transform ${openMenu === n.l ? "rotate-180" : ""}`} />
                  </button>
                  {openMenu === n.l && (
                    <div className={`absolute top-full left-0 pt-2 w-60`}>
                      <div className={`rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise`}>
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
                <RouteLink key={n.r} r={n.r} onNavigate={closeAll} aria-current={route === n.r ? "page" : undefined} className={`px-3.5 py-2 rounded-full text-sm font-bold ${route === n.r ? "bg-blue-600/10" : c.hoverSoft}`}>
                  <span className="grad-text">{t(n.l)}</span>
                </RouteLink>
              ) : (
                <RouteLink key={n.r} r={n.r} onNavigate={closeAll} aria-current={route === n.r ? "page" : undefined} className={`px-3.5 py-2 rounded-full text-sm font-medium ${route === n.r ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}>{t(n.l)}</RouteLink>
              )
            )}
          </nav>
          <div className="flex items-center gap-1.5">
            {role === ROLES.ADMIN && (
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
                            <button onClick={() => markRead(nf.id)} className="flex-1 min-w-0 text-left">
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
              <div className="hidden md:flex items-center gap-2 ml-1">
                {user.admin && (
                  <button onClick={() => go("admin")} aria-label={t("Administration")} className={`p-2.5 rounded-full ${route === "admin" ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}><Shield size={18} /></button>
                )}
                <button onClick={() => go("profile")} aria-label={t("Mon profil")} className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border ${c.border} ${c.hoverSoft}`}>
                  <span className="w-7 h-7 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center">{user.name[0]}</span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className={`text-sm font-semibold ${c.text}`}>{user.name}</span>
                    {role === ROLES.PREMIUM_USER && <span className="text-[10px] font-bold text-blue-600">Premium</span>}
                  </span>
                </button>
                <button onClick={() => { signOut(); go("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); }} aria-label={t("Se déconnecter")} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><LogOut size={17} /></button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Btn small variant="ghost" onClick={() => go("login")}>{t("Connexion")}</Btn>
                <Btn small onClick={() => go("register")}>{t("S'inscrire")}</Btn>
              </div>
            )}
            <button onClick={() => setOpen(!open)} aria-label="Menu" className={`lg:hidden p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <div className={`lg:hidden border-t ${c.navBorder} ${c.card} px-4 py-4 max-h-[75vh] overflow-y-auto rise`}>
            {mobileLinks.map((m) => (
              <RouteLink key={m.l} r={m.r} onNavigate={closeAll} className={`block w-full text-left px-3 py-3 rounded-xl text-sm font-medium ${m.grad ? "font-bold" : c.text} ${c.hoverSoft}`}>
                {m.grad ? <span className="grad-text">{t(m.l)}</span> : t(m.l)}
              </RouteLink>
            ))}
            <div className="flex gap-2 pt-3">
              {user ? <Btn small variant="ghost" className="flex-1" onClick={() => { signOut(); go("home"); }}>{t("Se déconnecter")}</Btn> : (<><Btn small variant="ghost" className="flex-1" onClick={() => go("login")}>{t("Connexion")}</Btn><Btn small className="flex-1" onClick={() => go("register")}>{t("S'inscrire")}</Btn></>)}
            </div>
          </div>
        )}
      </header>
      {searchOpen && role === ROLES.ADMIN && <SearchOverlay close={() => setSearchOpen(false)} />}
    </>
  );
}
