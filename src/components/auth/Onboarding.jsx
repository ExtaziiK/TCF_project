import { useEffect, useState } from "react";
import { Leaf, AtSign, Globe, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { getProfile, isValidUsername, isUsernameAvailable, completeGoogleProfile } from "@/services/authService";
import { COUNTRIES } from "@/constants/exam";

// Shown once, right after a NEW account registers with Google: the OAuth flow
// gives us an email and name but no username choice or country, so we collect
// them here before letting the account into the app. Rendered as a full-page
// gate by AppShell while AppProvider's `pendingOnboarding` is set.
export function Onboarding() {
  const { c, user, notify, completeOnboarding, t } = useApp();
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inp = `w-full pl-11 pr-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  // Prefill with the username the signup trigger auto-generated from the email,
  // so the field is never empty and a user who's happy with it can just submit.
  useEffect(() => { getProfile().then((p) => { if (p?.username) setUsername(p.username); }); }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!isValidUsername(username)) return setError(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."));
    if (!country) return setError(t("Sélectionnez votre pays pour continuer."));
    setBusy(true);
    try {
      // Only check availability if it differs from the reserved auto-username.
      const current = (await getProfile())?.username;
      if (username.trim().toLowerCase() !== current && !(await isUsernameAvailable(username))) {
        return setError(t("Ce nom d'utilisateur est déjà pris."));
      }
      const { error: err } = await completeGoogleProfile({ username, country });
      if (err) return setError(err.message || t("Enregistrement refusé. Réessayez."));
      notify(t("Bienvenue ! Votre compte est prêt."));
      completeOnboarding();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Leaf size={22} /></span>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>{t("Finalisez votre compte")}</h1>
          <p className={`text-sm mt-1.5 ${c.sub}`}>
            {t("Bienvenue")}{user?.name ? `, ${user.name}` : ""} ! {t("Choisissez un nom d'utilisateur et votre pays pour terminer.")}
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="relative">
            <AtSign size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
            <input placeholder={t("Nom d'utilisateur")} aria-label={t("Nom d'utilisateur")} autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} className={inp} />
          </div>
          <div className="relative">
            <Globe size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
            <select aria-label={t("Pays")} value={country} onChange={(e) => { setCountry(e.target.value); setError(""); }} className={`${inp} ${country ? "" : c.faint}`}>
              <option value="">{t("Sélectionnez votre pays")}</option>
              {COUNTRIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {error && (
            <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/30 rise">
              <p className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" />{error}</p>
            </div>
          )}
          <Btn type="submit" className="w-full" variant="accent" disabled={busy}>
            {busy ? t("Création…") : t("Créer mon compte")}
          </Btn>
        </form>
      </Card>
    </main>
  );
}
