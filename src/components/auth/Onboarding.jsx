import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProfile, isValidName, isValidUsername, isUsernameAvailable, completeProfile } from "@/services/authService";
import { listProfiles, renameProfile } from "@/services/profileService";
import { TermsConsent } from "@/components/auth/TermsConsent";
import { COUNTRIES } from "@/constants/exam";

// The profile popup that finishes a new account, over the dashboard. Sign-up
// asks for an address and a password only (or nothing, with Google); the
// first name, username, country and the terms are collected here, right
// after the account is confirmed. Rendered by AppShell while AppProvider's
// `needsProfile` is set, which stays true — across reloads and devices, for an
// email account — until this form is submitted. It cannot be dismissed: the
// terms have to be accepted before the account is used.
export function Onboarding() {
  const { c, user, notify, completeOnboarding, pendingOnboarding, route, nav, dark, t } = useApp();
  // Google hands over a name; an email account starts with none.
  const [name, setName] = useState(() => (user?.name && user.name !== user.email?.split("@")[0] ? user.name : ""));
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false); // terms gate
  const inp = `w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  // The popup belongs on the dashboard: a new account lands there.
  useEffect(() => { if (route !== "dashboard") nav("dashboard", { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Prefill with the username the signup trigger auto-generated from the email,
  // so the field is never empty and a user who's happy with it can just submit.
  useEffect(() => { getProfile().then((p) => { if (p?.username) setUsername(p.username); }); }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!isValidName(name)) return setError(t("Prénom : 2 à 40 caractères, lettres uniquement (accents, - et ' acceptés)."));
    if (!isValidUsername(username)) return setError(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."));
    if (!country) return setError(t("Sélectionnez votre pays pour continuer."));
    if (!accepted) return setError(t("Vous devez lire et accepter les conditions générales pour créer un compte."));
    setBusy(true);
    try {
      // Only check availability if it differs from the reserved auto-username.
      const current = (await getProfile())?.username;
      if (username.trim().toLowerCase() !== current && !(await isUsernameAvailable(username))) {
        return setError(t("Ce nom d'utilisateur est déjà pris."));
      }
      const { error: err } = await completeProfile({
        name, username, country, acceptedTerms: true,
        source: pendingOnboarding ? "google_onboarding" : "email_signup",
      });
      if (err) return setError(err.message || t("Enregistrement refusé. Réessayez."));
      // The account's first learner profile was named at signup, before there
      // was a first name ("Profil 1" for an email account): give it the name.
      try {
        const { items } = await listProfiles();
        if (items.length === 1 && items[0].name === "Profil 1") await renameProfile(items[0].id, name);
      } catch { /* cosmetic — never block the account over it */ }
      notify(t("Bienvenue ! Votre compte est prêt."));
      completeOnboarding();
    } finally {
      setBusy(false);
    }
  };

  const Label = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className={`block mb-1.5 text-sm font-semibold ${c.text}`}>{children}<span className="text-rose-500"> *</span></label>
  );

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className={`w-full max-w-lg rounded-3xl p-7 sm:p-8 shadow-2xl rise ${c.card}`}>
        <div className="mb-6">
          <img src="/logo-mark.webp" alt="" width="40" height="40" className="w-10 h-10 object-contain" />
          <h2 id="onboarding-title" className={`font-display font-bold text-2xl mt-4 ${c.text}`}>{t("Finalisez votre compte")}</h2>
          <p className={`text-sm mt-1.5 ${c.sub}`}>{t("Encore quelques informations et votre espace est prêt.")}</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="onboarding-name">{t("Prénom")}</Label>
              <input id="onboarding-name" autoComplete="given-name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className={inp} />
            </div>
            <div>
              <Label htmlFor="onboarding-username">{t("Nom d'utilisateur")}</Label>
              <input id="onboarding-username" autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} className={inp} />
            </div>
          </div>
          <div>
            <Label htmlFor="onboarding-country">{t("Pays")}</Label>
            <select id="onboarding-country" value={country} onChange={(e) => { setCountry(e.target.value); setError(""); }} className={`${inp} ${country ? "" : c.faint}`}>
              <option value="">{t("Sélectionnez votre pays")}</option>
              {COUNTRIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <TermsConsent accepted={accepted} onChange={(v) => { setAccepted(v); setError(""); }} />
          {error && (
            <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/30 rise">
              <p className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" />{error}</p>
            </div>
          )}
          <button type="submit" disabled={busy}
            className={`w-full py-3.5 rounded-full text-sm font-bold transition hover:opacity-90 disabled:opacity-50 ${dark ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
            {busy ? t("Enregistrement…") : t("Terminer")}
          </button>
        </form>
      </div>
    </div>
  );
}
