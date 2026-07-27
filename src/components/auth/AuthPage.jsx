import { useEffect, useState } from "react";
import { Leaf, Mail, Lock, User, AtSign, Globe, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { signIn, signUp, resetPassword, signInWithGoogle, mapSupabaseUser, isValidUsername, isUsernameAvailable, consumeFirstLogin } from "@/services/authService";
import { COUNTRIES } from "@/constants/exam";

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20.5H24v7h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5-5C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l5.8 4.2C13.7 15.1 18.5 12 24 12c3.1 0 5.9 1.2 8 3.1l5-5C33.6 6.1 29 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.6-1.7 12.9-4.6l-6-5c-1.9 1.4-4.3 2.2-6.9 2.2-5.3 0-9.7-3.4-11.3-8.1l-5.9 4.5C10.1 39.8 16.5 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6 5C41.4 34.9 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

export function AuthPage({ mode }) {
  const { c, nav, notify, t, user } = useApp();
  const [view, setView] = useState(mode); // login | register | reset
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [identifier, setIdentifier] = useState(""); // login: username or email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const [notice, setNotice] = useState(""); // non-lock notices (e.g. device limit)
  useEffect(() => setView(mode), [mode]);
  // Already signed in? The login/register pages don't apply — bounce to the
  // landing page (admins/owners to the panel, everyone else to their
  // dashboard). Runs once on arrival, so a fresh login on this page — which
  // navigates on its own via submit() — isn't double-redirected.
  useEffect(() => {
    if (user) nav(user.admin || user.owner ? "admin" : "dashboard", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const inp = `w-full pl-11 pr-11 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const goView = (v) => { setView(v); setLockMsg(""); setNotice(""); };

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      if (view === "login") {
        const r = await signIn({ identifier, password });
        if (!r.ok) {
          if (r.locked) { setNotice(""); setLockMsg(r.message); }
          else if (r.deviceLimitReached) { setLockMsg(""); setNotice(r.message); }
          else { setLockMsg(""); setNotice(""); notify(r.message); }
          return;
        }
        setLockMsg(""); setNotice("");
        notify(t("Bon retour parmi nous !"));
        const firstLogin = consumeFirstLogin(r.user?.id);
        nav(r.user?.admin || r.user?.owner ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
      } else if (view === "register") {
        if (!isValidUsername(username)) return notify(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."));
        if (!country) return notify(t("Sélectionnez votre pays pour continuer."));
        if (!(await isUsernameAvailable(username))) return notify(t("Ce nom d'utilisateur est déjà pris."));
        const { data, error, needsEmailConfirmation } = await signUp({ name, username, email, password, country });
        if (error) return notify(error.message);
        if (needsEmailConfirmation) setVerify(true);
        else {
          const newUser = mapSupabaseUser(data.session);
          const firstLogin = consumeFirstLogin(newUser?.id);
          nav(newUser?.admin || newUser?.owner ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) return notify(error.message);
        setResetSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    // Both the login and register buttons use the same flow: a new Google
    // identity is routed to onboarding to finish creating its account (see
    // AppProvider), an existing one just signs in.
    const { error } = await signInWithGoogle();
    if (error) { notify(error.message); setBusy(false); }
    // on success the browser redirects to Google, so no further state change here
  };

  // Signed in already: render nothing while the effect above redirects, so the
  // login form never flashes.
  if (user) return null;

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Leaf size={22} /></span>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>
            {view === "login" ? t("Bon retour !") : view === "register" ? t("Créer votre compte") : t("Réinitialiser le mot de passe")}
          </h1>
          <p className={`text-sm mt-1.5 ${c.sub}`}>
            {view === "login" ? t("Reprenez votre préparation là où vous l'avez laissée.") : view === "register" ? t("Gratuit, sans carte bancaire. Prêt en 30 secondes.") : t("Entrez votre courriel : nous vous enverrons un lien sécurisé.")}
          </p>
        </div>
        {verify ? (
          <div className="text-center py-6 rise">
            <Mail size={36} className="text-blue-600 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Vérifiez votre boîte de réception")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t("Un courriel de confirmation a été envoyé à")} <span className="font-semibold">{email || t("votre adresse")}</span>{t(". Cliquez sur le lien pour activer votre compte.")}</p>
          </div>
        ) : resetSent ? (
          <div className="text-center py-6 rise">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Lien envoyé")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t("Si un compte existe pour cette adresse, un lien de réinitialisation valide 30 minutes vient d'être envoyé.")}</p>
            <Btn variant="ghost" className="mt-6 w-full" onClick={() => { setResetSent(false); setView("login"); }}>{t("Retour à la connexion")}</Btn>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            {view !== "reset" && (
              <>
                <button type="button" disabled={busy} onClick={google} className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border text-sm font-semibold ${c.inputCls} ${c.hoverSoft} disabled:opacity-60`}>
                  <GoogleIcon /> {t("Continuer avec Google")}
                </button>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 border-t ${c.border}`} />
                  <span className={`text-xs ${c.faint}`}>{t("ou")}</span>
                  <div className={`flex-1 border-t ${c.border}`} />
                </div>
              </>
            )}
            {view === "register" && (
              <>
                <div className="relative">
                  <User size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                  <input placeholder={t("Prénom")} aria-label={t("Prénom")} value={name} onChange={(e) => setName(e.target.value)} className={inp} />
                </div>
                <div className="relative">
                  <AtSign size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                  <input placeholder={t("Nom d'utilisateur")} aria-label={t("Nom d'utilisateur")} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inp} />
                </div>
                <div className="relative">
                  <Globe size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                  <select aria-label={t("Pays")} value={country} onChange={(e) => setCountry(e.target.value)} className={`${inp} ${country ? "" : c.faint}`}>
                    <option value="">{t("Sélectionnez votre pays")}</option>
                    {COUNTRIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </>
            )}
            {view === "login" ? (
              <div className="relative">
                <User size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                <input placeholder={t("Nom d'utilisateur ou courriel")} aria-label={t("Nom d'utilisateur ou courriel")} autoComplete="username" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setLockMsg(""); setNotice(""); }} className={inp} />
              </div>
            ) : (
              <div className="relative">
                <Mail size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                <input placeholder={t("Courriel")} aria-label={t("Courriel")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
              </div>
            )}
            {view !== "reset" && (
              <div className="relative">
                <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input placeholder={t("Mot de passe")} aria-label={t("Mot de passe")} type={showPw ? "text" : "password"} autoComplete={view === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            )}
            {view === "login" && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => goView("reset")} className="text-xs font-semibold text-blue-600 hover:underline">{t("Mot de passe oublié ?")}</button>
              </div>
            )}
            {lockMsg && (
              <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/30 rise">
                <p className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" />{lockMsg}</p>
                <button type="button" onClick={() => goView("reset")} className="mt-2 ml-6 text-sm font-semibold text-blue-600 hover:underline">{t("Réinitialiser le mot de passe")}</button>
              </div>
            )}
            {notice && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 rise">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" />{t(notice)}</p>
              </div>
            )}
            <Btn type="submit" className="w-full" variant="accent" disabled={busy}>
              {view === "login" ? t("Se connecter") : view === "register" ? t("Créer mon compte") : t("Envoyer le lien")}
            </Btn>
            <p className={`text-center text-sm ${c.sub}`}>
              {view === "login" ? (<>{t("Pas encore de compte ?")} <button type="button" onClick={() => goView("register")} className="font-semibold text-blue-600 hover:underline">{t("S'inscrire")}</button></>) : (<>{t("Déjà inscrit·e ?")} <button type="button" onClick={() => goView("login")} className="font-semibold text-blue-600 hover:underline">{t("Se connecter")}</button></>)}
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}
