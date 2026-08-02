import { useEffect, useState } from "react";
import { Mail, Lock, User, AtSign, Globe, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { signIn, signUp, resetPassword, signInWithGoogle, mapSupabaseUser, isValidName, isValidUsername, isUsernameAvailable, consumeFirstLogin, authErrorMessage, validatePassword, verifySignupCode, resendSignupCode } from "@/services/authService";
import { PasswordMeter } from "@/components/auth/PasswordMeter";
import { TermsConsent } from "@/components/auth/TermsConsent";
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
  const [confirm, setConfirm] = useState(""); // register only
  const [accepted, setAccepted] = useState(false); // terms gate, register only
  const [resetSent, setResetSent] = useState(false);
  const [verify, setVerify] = useState(false); // awaiting the emailed 6-digit code
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds before "resend" re-arms
  const [busy, setBusy] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const [notice, setNotice] = useState(""); // non-lock notices (e.g. device limit)
  useEffect(() => setView(mode), [mode]);
  // Re-arms the resend button. Supabase rate-limits resends server-side, so the
  // cooldown is there to stop a candidate tripping that limit on their own signup.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
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
          else { setLockMsg(""); setNotice(""); notify(r.message, "error"); }
          return;
        }
        setLockMsg(""); setNotice("");
        notify(t("Bon retour parmi nous !"));
        const firstLogin = consumeFirstLogin(r.user?.id);
        nav(r.user?.admin || r.user?.owner ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
      } else if (view === "register") {
        if (!isValidName(name)) return notify(t("Prénom : 2 à 40 caractères, lettres uniquement (accents, - et ' acceptés)."), "error");
        if (!isValidUsername(username)) return notify(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."), "error");
        if (!country) return notify(t("Sélectionnez votre pays pour continuer."), "error");
        const pwCheck = validatePassword(password);
        if (!pwCheck.ok) return notify(t(pwCheck.error), "error");
        if (password !== confirm) return notify(t("Les deux mots de passe ne correspondent pas."), "error");
        if (!accepted) return notify(t("Vous devez lire et accepter les conditions générales pour créer un compte."), "error");
        if (!(await isUsernameAvailable(username))) return notify(t("Ce nom d'utilisateur est déjà pris."), "error");
        const { data, error, needsEmailConfirmation } = await signUp({ name, username, email, password, country, acceptedTerms: true });
        if (error) return notify(authErrorMessage(error), "error");
        if (needsEmailConfirmation) setVerify(true);
        else {
          const newUser = mapSupabaseUser(data.session);
          const firstLogin = consumeFirstLogin(newUser?.id);
          nav(newUser?.admin || newUser?.owner ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) return notify(authErrorMessage(error), "error");
        setResetSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  // Signing in lands the new account exactly where a normal signup would.
  const enter = (session) => {
    const newUser = mapSupabaseUser(session);
    const firstLogin = consumeFirstLogin(newUser?.id);
    nav(newUser?.admin || newUser?.owner ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { session, error } = await verifySignupCode(email, code);
      if (error) return notify(authErrorMessage(error), "error");
      if (!session) return notify(t("Code vérifié, mais la session n'a pas pu s'ouvrir. Connectez-vous."), "error");
      notify(t("Votre compte est activé. Bienvenue !"));
      enter(session);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      const { error } = await resendSignupCode(email);
      if (error) return notify(authErrorMessage(error), "error");
      setCode("");
      setCooldown(60);
      notify(t("Un nouveau code vient d'être envoyé."));
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
    if (error) { notify(authErrorMessage(error), "error"); setBusy(false); }
    // on success the browser redirects to Google, so no further state change here
  };

  // Signed in already: render nothing while the effect above redirects, so the
  // login form never flashes.
  if (user) return null;

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <div className="relative inline-block group">
            <img src="/logo-mark.png" alt="" width="64" height="64" className="block w-16 h-16 object-contain transition-transform duration-200 group-hover:scale-125" />
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10 whitespace-nowrap rounded-full bg-slate-900/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {t("Vous êtes au bon endroit ! 🍁")}
            </span>
          </div>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>
            {view === "login" ? t("Bon retour !") : view === "register" ? t("Créer votre compte") : t("Réinitialiser le mot de passe")}
          </h1>
          <p className={`text-sm mt-1.5 ${c.sub}`}>
            {view === "login" ? t("Reprenez votre préparation là où vous l'avez laissée.") : view === "register" ? t("Gratuit, sans carte bancaire. Prêt en 30 secondes.") : t("Entrez votre courriel : nous vous enverrons un lien sécurisé.")}
          </p>
        </div>
        {verify ? (
          <form className="text-center py-4 rise" onSubmit={submitCode}>
            <Mail size={36} className="text-blue-600 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Entrez votre code de confirmation")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t("Nous avons envoyé un code à 6 chiffres à")} <span className="font-semibold">{email || t("votre adresse")}</span>.</p>
            <input
              value={code}
              // Digits only, capped at 6: the field should not accept anything
              // the code cannot be. inputMode brings up the numeric keypad.
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="------"
              aria-label={t("Code de confirmation")}
              className={`mt-6 w-full text-center font-mono2 text-3xl tracking-[0.5em] indent-[0.5em] py-4 rounded-2xl border ${c.inputCls}`}
            />
            <Btn type="submit" variant="accent" className="mt-4 w-full" disabled={busy || code.length !== 6}>
              {t(busy ? "Vérification…" : "Activer mon compte")}
            </Btn>
            <button type="button" onClick={resend} disabled={busy || cooldown > 0} className={`mt-4 text-sm font-semibold ${cooldown > 0 ? c.faint : "text-blue-600"} disabled:cursor-not-allowed`}>
              {cooldown > 0 ? `${t("Renvoyer le code dans")} ${cooldown} s` : t("Je n'ai rien reçu — renvoyer le code")}
            </button>
            <p className={`mt-3 text-xs ${c.faint}`}>{t("Pensez à regarder dans vos courriels indésirables.")}</p>
          </form>
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
              <div>
                <div className="relative">
                  <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} />
                  <input placeholder={t("Mot de passe")} aria-label={t("Mot de passe")} type={showPw ? "text" : "password"} autoComplete={view === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                {/* Only while choosing a password — scoring the one being typed
                    at login would leak how strong the stored password is. */}
                {view === "register" && <PasswordMeter password={password} email={email} username={username} />}
              </div>
            )}
            {view === "register" && (
              <div className="relative">
                <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input placeholder={t("Confirmer le mot de passe")} aria-label={t("Confirmer le mot de passe")} type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inp} />
                {confirm && (
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${password === confirm ? "text-emerald-500" : "text-rose-500"}`} aria-hidden="true">
                    {password === confirm ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                  </span>
                )}
              </div>
            )}
            {view === "login" && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => goView("reset")} className="text-xs font-semibold text-blue-600 hover:underline">{t("Mot de passe oublié ?")}</button>
              </div>
            )}
            {view === "register" && <TermsConsent accepted={accepted} onChange={setAccepted} />}
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
