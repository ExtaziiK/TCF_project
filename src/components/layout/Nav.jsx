import { useState } from "react";
import { Menu, X, Sun, Moon, Bell, Search, ChevronDown, ChevronRight, LogOut, Shield } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { Logo } from "@/components/layout/Logo";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { NAV_LINKS, ACCOUNT_LINKS, navLinksForRole } from "@/constants/navigation";
import { NOTIFS } from "@/constants/gamification";
import { ROLES } from "@/auth/rbac";

export function Nav() {
  const { c, dark, setDark, nav, route, user, signOut, notify, role } = useApp();
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const go = (r) => { nav(r); setOpen(false); setDd(false); setNotifOpen(false); };
  const navLinks = navLinksForRole(NAV_LINKS, role);
  const accountLinks = navLinksForRole(ACCOUNT_LINKS, role);
  const mobileLinks = [
    ...navLinks.flatMap((n) => (n.menu ? n.menu : [n])),
    ...accountLinks,
    { l: "Contact", r: "contact" },
  ];
  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 border-b ${c.navBorder} ${c.nav} backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-3">
          <Logo onClick={() => go("home")} />
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
            {navLinks.map((n) =>
              n.menu ? (
                <div key={n.l} className="relative" onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
                  <button className={`px-3.5 py-2 rounded-full text-sm font-medium flex items-center gap-1 ${c.sub} ${c.hoverSoft}`} aria-expanded={dd}>
                    {n.l} <ChevronDown size={14} className={`transition-transform ${dd ? "rotate-180" : ""}`} />
                  </button>
                  {dd && (
                    <div className={`absolute top-full left-0 pt-2 w-60`}>
                      <div className={`rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise`}>
                        {n.menu.map((m) => (
                          <button key={m.r + m.l} onClick={() => go(m.r)} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm ${c.text} ${c.hoverSoft} flex items-center justify-between group`}>
                            {m.l}<ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button key={n.r} onClick={() => go(n.r)} className={`px-3.5 py-2 rounded-full text-sm font-medium ${route === n.r ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}>{n.l}</button>
              )
            )}
          </nav>
          <div className="flex items-center gap-1.5">
            {role === ROLES.ADMIN && (
              <button onClick={() => setSearchOpen(true)} aria-label="Rechercher" className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><Search size={18} /></button>
            )}
            <button onClick={() => setDark(!dark)} aria-label={dark ? "Mode clair" : "Mode sombre"} className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user && (
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications" className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft} relative`}>
                  <Bell size={18} /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-600" />
                </button>
                {notifOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border ${c.border} ${c.card} shadow-2xl p-2 rise z-50`}>
                    <p className={`px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider ${c.faint}`}>Notifications</p>
                    {NOTIFS.map((nf, i) => (
                      <div key={i} className={`flex gap-3 px-3 py-3 rounded-xl ${c.hoverSoft}`}>
                        <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><nf.icon size={16} /></span>
                        <div><p className={`text-sm ${c.text}`}>{nf.t}</p><p className={`text-xs ${c.faint} mt-0.5`}>{nf.time}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {user ? (
              <div className="hidden md:flex items-center gap-2 ml-1">
                {user.admin && (
                  <button onClick={() => go("admin")} aria-label="Administration" className={`p-2.5 rounded-full ${route === "admin" ? "text-blue-600 bg-blue-600/10" : `${c.sub} ${c.hoverSoft}`}`}><Shield size={18} /></button>
                )}
                <button onClick={() => go("profile")} aria-label="Mon profil" className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border ${c.border} ${c.hoverSoft}`}>
                  <span className="w-7 h-7 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center">{user.name[0]}</span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className={`text-sm font-semibold ${c.text}`}>{user.name}</span>
                    {role === ROLES.PREMIUM_USER && <span className="text-[10px] font-bold text-blue-600">Premium</span>}
                  </span>
                </button>
                <button onClick={() => { signOut(); go("home"); notify("Vous êtes déconnecté·e. À bientôt !"); }} aria-label="Se déconnecter" className={`p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}><LogOut size={17} /></button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Btn small variant="ghost" onClick={() => go("login")}>Connexion</Btn>
                <Btn small onClick={() => go("register")}>S'inscrire</Btn>
              </div>
            )}
            <button onClick={() => setOpen(!open)} aria-label="Menu" className={`lg:hidden p-2.5 rounded-full ${c.sub} ${c.hoverSoft}`}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <div className={`lg:hidden border-t ${c.navBorder} ${c.card} px-4 py-4 max-h-[75vh] overflow-y-auto rise`}>
            {mobileLinks.map((m) => (
              <button key={m.l} onClick={() => go(m.r)} className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium ${c.text} ${c.hoverSoft}`}>{m.l}</button>
            ))}
            <div className="flex gap-2 pt-3">
              {user ? <Btn small variant="ghost" className="flex-1" onClick={() => { signOut(); go("home"); }}>Se déconnecter</Btn> : (<><Btn small variant="ghost" className="flex-1" onClick={() => go("login")}>Connexion</Btn><Btn small className="flex-1" onClick={() => go("register")}>S'inscrire</Btn></>)}
            </div>
          </div>
        )}
      </header>
      {searchOpen && role === ROLES.ADMIN && <SearchOverlay close={() => setSearchOpen(false)} />}
    </>
  );
}
