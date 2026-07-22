import { useEffect, useState } from "react";
import {
  User, AtSign, Mail, Lock, Eye, EyeOff, Crown, CreditCard, Moon, Sun,
  CalendarDays, LogOut, Check, Shield,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { ROLES, isStaff } from "@/auth/rbac";
import {
  getProfile, updateDisplayName, updateUsername, updatePassword,
  isValidUsername, isUsernameAvailable,
} from "@/services/authService";
import { openBillingPortal } from "@/services/stripeService";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "—");

function ProfileSection({ icon: Icon, title, desc, children }) {
  const { c } = useApp();
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={18} /></span>
        <div>
          <h3 className={`font-display font-bold ${c.text}`}>{title}</h3>
          {desc && <p className={`text-sm ${c.sub}`}>{desc}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function Profile() {
  const { c, user, role, nav, notify, dark, setDark, signOut, t } = useApp();
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [createdAt, setCreatedAt] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [busyPortal, setBusyPortal] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return;
      setUsername(p.username || "");
      setInitialUsername(p.username || "");
      setCreatedAt(p.createdAt);
    });
  }, []);

  const isPremium = role === ROLES.PREMIUM_USER || (isStaff(role) && user.plan === "Premium");

  const saveProfile = async () => {
    const nameChanged = name.trim() && name.trim() !== user.name;
    const uChanged = username.trim().toLowerCase() !== initialUsername;
    if (!nameChanged && !uChanged) return notify(t("Aucune modification à enregistrer."));
    setSavingProfile(true);
    try {
      if (uChanged) {
        if (!isValidUsername(username)) return notify(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."));
        if (!(await isUsernameAvailable(username))) return notify(t("Ce nom d'utilisateur est déjà pris."));
        const { error } = await updateUsername(username);
        if (error) return notify(error.message);
        setInitialUsername(username.trim().toLowerCase());
      }
      if (nameChanged) {
        const { error } = await updateDisplayName(name);
        if (error) return notify(error.message);
      }
      notify(t("Profil mis à jour."));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (pw.length < 6) return notify(t("Le mot de passe doit contenir au moins 6 caractères."));
    if (pw !== pw2) return notify(t("Les deux mots de passe ne correspondent pas."));
    setSavingPw(true);
    try {
      const { error } = await updatePassword(pw);
      if (error) return notify(error.message);
      setPw(""); setPw2("");
      notify(t("Mot de passe mis à jour."));
    } finally {
      setSavingPw(false);
    }
  };

  const manageSubscription = async () => {
    setBusyPortal(true);
    try {
      await openBillingPortal();
    } catch {
      notify(t("Gestion de l'abonnement indisponible pour le moment."));
      setBusyPortal(false);
    }
  };

  return (
    <PageShell back eyebrow={t("Mon compte")} title={t("Profil et paramètres")} sub={t("Gérez vos informations, votre abonnement et vos préférences.")}>
      {/* identity header */}
      <Card className="p-6 mb-5 flex items-center gap-5">
        <span className="w-16 h-16 rounded-full grad-brand text-white text-2xl font-bold flex items-center justify-center shrink-0">{(user.name || "?")[0].toUpperCase()}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`font-display font-bold text-xl ${c.text}`}>{user.name}</h2>
            {user.owner && <Pill tone="amber"><Shield size={12} /> Owner</Pill>}
            {user.admin && <Pill tone="blue"><Shield size={12} /> Admin</Pill>}
            {isPremium ? <Pill tone="blue"><Crown size={12} /> {user.planLabel || "Premium"}</Pill> : <Pill tone="slate">{t("Sans papier")}</Pill>}
          </div>
          {initialUsername && <p className={`text-sm ${c.sub}`}>@{initialUsername}</p>}
          <p className={`text-sm ${c.faint}`}>{user.email}</p>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* personal info */}
        <ProfileSection icon={User} title={t("Informations personnelles")} desc={t("Votre nom et votre identifiant de connexion.")}>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Prénom")}</label>
              <div className="relative mt-1.5">
                <User size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("Prénom")} className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Nom d'utilisateur")}</label>
              <div className="relative mt-1.5">
                <AtSign size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={username} onChange={(e) => setUsername(e.target.value)} aria-label={t("Nom d'utilisateur")} className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Courriel")}</label>
              <div className="relative mt-1.5">
                <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={user.email} disabled aria-label={t("Courriel")} className={`${inp} pl-10 opacity-60 cursor-not-allowed`} />
              </div>
            </div>
            <Btn small icon={Check} disabled={savingProfile} onClick={saveProfile}>{t(savingProfile ? "Enregistrement…" : "Enregistrer")}</Btn>
          </div>
        </ProfileSection>

        {/* security */}
        <ProfileSection icon={Lock} title={t("Sécurité")} desc={t("Changez votre mot de passe à tout moment.")}>
          <div className="space-y-3">
            <div className="relative">
              <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
              <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("Nouveau mot de passe")} aria-label={t("Nouveau mot de passe")} autoComplete="new-password" className={`${inp} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <div className="relative">
              <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
              <input type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t("Confirmer le mot de passe")} aria-label={t("Confirmer le mot de passe")} autoComplete="new-password" className={`${inp} pl-10`} />
            </div>
            <Btn small variant="ghost" disabled={savingPw || !pw} onClick={changePassword}>{savingPw ? "…" : t("Mettre à jour le mot de passe")}</Btn>
          </div>
        </ProfileSection>

        {/* subscription */}
        <ProfileSection icon={CreditCard} title={t("Abonnement")} desc={t(isPremium ? "Votre forfait Premium est actif." : "Vous utilisez le forfait gratuit Sans papier.")}>
          {isPremium ? (
            <div className="space-y-3">
              <div className={`p-4 rounded-2xl bg-blue-600/10`}>
                <p className={`font-semibold ${c.text} flex items-center gap-2`}><Crown size={16} className="text-blue-600" /> {user.planLabel || "Premium"}</p>
                {user.premiumUntil && <p className={`text-sm mt-1 ${c.sub}`}>{t("Renouvellement / échéance :")} {t(fmtDate(user.premiumUntil))}</p>}
              </div>
              <Btn small variant="ghost" icon={CreditCard} disabled={busyPortal} onClick={manageSubscription}>{t(busyPortal ? "Ouverture…" : "Gérer mon abonnement")}</Btn>
              <p className={`text-xs ${c.faint}`}>{t("Mettez à jour votre carte, consultez vos factures ou annulez via le portail sécurisé Stripe.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-sm ${c.sub}`}>{t("Passez à Premium pour débloquer tous les modules, les TCF blancs complets et l'analyse IA.")}</p>
              <Btn small variant="accent" icon={Crown} onClick={() => nav("pricing")}>{t("Passer à Premium")}</Btn>
            </div>
          )}
        </ProfileSection>

        {/* preferences + account */}
        <ProfileSection icon={CalendarDays} title={t("Préférences et compte")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${c.text} flex items-center gap-2`}>{dark ? <Moon size={16} /> : <Sun size={16} />} {t("Thème sombre")}</span>
              <button role="switch" aria-checked={dark} aria-label={t("Thème sombre")} onClick={() => setDark(!dark)} className={`w-11 h-6 rounded-full transition-colors relative ${dark ? "bg-blue-600" : c.track}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className={`flex items-center justify-between text-sm ${c.sub}`}>
              <span className="flex items-center gap-2"><CalendarDays size={16} /> {t("Membre depuis")}</span>
              <span className="font-mono2">{t(fmtDate(createdAt))}</span>
            </div>
            <div className={`pt-2 border-t ${c.border}`}>
              <Btn small variant="ghost" icon={LogOut} className="text-rose-600" onClick={() => { signOut(); nav("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); }}>{t("Se déconnecter")}</Btn>
            </div>
          </div>
        </ProfileSection>
      </div>
    </PageShell>
  );
}
