import { useEffect, useState } from "react";
import { Mail, Eye, EyeOff, CheckCircle2, AlertTriangle, BookOpen, Trophy, Sparkles, ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { signIn, signUp, resetPassword, signInWithGoogle, mapSupabaseUser, consumeFirstLogin, authErrorMessage, validatePassword, verifySignupCode, resendSignupCode, abandonPendingSignup, CONFIRM_CODE_LENGTH } from "@/services/authService";
import { PasswordMeter } from "@/components/auth/PasswordMeter";
import { CodeInput } from "@/components/auth/CodeInput";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useRatingSummary } from "@/hooks/useRatingSummary";
import { BRAND, Bubble, Tile, Tag } from "@/components/decor/stickers";

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

// The left half of the page (lg+), after Brevo's sign-up: a flat brand-colour
// panel crossed by one thin stepped line with two sparkles on it, around a
// card that says what the account opens. The card shows the landing page's
// real figures (the same "Statistique" band, same admin switch); with the band
// switched off it falls back to three plain feature lines. Decorative line and
// sparkles are aria-hidden.
const PANEL_ICONS = [BookOpen, Trophy, Sparkles];
const PANEL_FALLBACK = ["Questions au format officiel", "TCF blancs notés sur 699", "Correction par IA de l'écrit et de l'oral"];

// A flat Canadian flag, as in the landing page's collage.
function Flag({ className = "" }) {
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden="true">
      <rect width="200" height="100" fill="#FFFFFF" />
      <rect width="50" height="100" fill="#D52B1E" />
      <rect x="150" width="50" height="100" fill="#D52B1E" />
      <path fill="#D52B1E" transform="translate(64 14) scale(0.72)"
        d="M50 3l8 17 9-5-3 25 15-12 4 8 12-2-6 15 6 5-22 16 4 10-23-4v22h-8V76l-23 4 4-10L5 54l6-5-6-15 12 2 4-8 15 12-3-25 9 5Z" />
    </svg>
  );
}

const STAR_PATH = "M0 -24C2 -6 6 -2 24 0C6 2 2 6 0 24C-2 6 -6 2 -24 0C-6 -2 -2 -6 0 -24Z";
const LINE = "M0 760H90a40 40 0 0 0 40-40V470a40 40 0 0 1 40-40H260 M540 400H640a40 40 0 0 0 40-40V120a40 40 0 0 1 40-40H800";
// The two runs of the line, separately, for the light that travels them.
const RUNS = ["M0 760H90a40 40 0 0 0 40-40V470a40 40 0 0 1 40-40H260", "M540 400H640a40 40 0 0 0 40-40V120a40 40 0 0 1 40-40H800"];

function SidePanel() {
  const { t, dark } = useApp();
  const stats = useHomeStats();
  const rating = useRatingSummary(); // null until there are enough reviews to mean anything
  const ink = dark ? "#C7D2E3" : "#14204A";
  const bg = dark ? "#13234A" : "#C9DAFB";
  const moving = typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const rows = stats.enabled && stats.items.length
    ? stats.items.slice(0, 3).map((it) => ({ key: it.key, strong: it.value, text: t(it.label) }))
    : PANEL_FALLBACK.map((l) => ({ key: l, strong: null, text: t(l) }));
  const { blue, violet, red, amber } = BRAND;
  return (
    <aside className="hidden lg:block relative overflow-hidden" style={{ background: bg }}>
      {/* A soft glow in the brand colours, behind everything. */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: blue, opacity: dark ? 0.35 : 0.22 }} />
        <div className="absolute -right-16 bottom-10 w-80 h-80 rounded-full blur-3xl" style={{ background: violet, opacity: dark ? 0.3 : 0.18 }} />
      </div>
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" fill="none">
        <path stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d={LINE} />
        {/* A small light running along each part of the line. */}
        {moving && RUNS.map((d, k) => (
          <circle key={k} r="5" fill={k ? violet : blue}>
            <animateMotion dur={k ? "7s" : "6s"} begin={k ? "-3s" : "0s"} repeatCount="indefinite" path={d} />
          </circle>
        ))}
        {[[130, 560, 0], [680, 210, 1]].map(([x, y, k]) => (
          <g key={k} transform={`translate(${x} ${y})`}>
            <path className={moving ? "auth-twinkle" : ""} style={{ animationDelay: `${k * -1.4}s` }}
              fill={bg} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" d={STAR_PATH} />
          </g>
        ))}
      </svg>

      <div className="relative h-full min-h-screen flex items-center justify-center p-10">
        <div className="relative">
          {/* The site's stickers, floating around the card. */}
          <div aria-hidden="true" className="absolute -top-10 -left-14 decor-float"><Tag text="699 pts" color={amber} tilt={-6} /></div>
          <div aria-hidden="true" className="absolute -top-6 -right-12 decor-float-slow"><Bubble text="Bonjour !" color={blue} solid tilt={6} tail="right" /></div>
          <div aria-hidden="true" className="absolute -bottom-8 -left-10 decor-sway"><Tile ch="É" pts={3} color={red} tilt={-8} /></div>
          <div aria-hidden="true" className="absolute -bottom-10 -right-10 decor-float"><Tag text="NCLC 9" color={violet} tilt={5} /></div>
          <div aria-hidden="true" className="absolute top-1/2 -right-16 decor-sway"><Flag className="w-12 h-6 shadow-md" /></div>

          <div className={moving ? "hero-float" : ""}>
            <div className="w-full max-w-sm rounded-3xl border-2 px-8 py-8 text-center shadow-[8px_8px_0_0_rgba(20,32,74,.18)]"
              style={{ borderColor: ink, background: dark ? "#0B1222" : "#FFFDF8", color: ink }}>
              <p className="font-display text-xl leading-snug">
                {t("Tout pour réussir le")} <strong className="font-extrabold">{t("TCF Canada")}</strong>
              </p>
              <ul className="mt-6 space-y-3">
                {rows.map((r, i) => {
                  const Icon = PANEL_ICONS[i % PANEL_ICONS.length];
                  return (
                    <li key={r.key} className="flex items-center gap-3 rounded-full border-2 px-4 py-2.5 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: ink }}>
                      <span className="grid place-items-center w-8 h-8 rounded-full shrink-0 text-white" style={{ background: ["#2E6BE6", "#D8354A", "#6C4FE0"][i % 3] }}>
                        <Icon size={16} />
                      </span>
                      <span className="text-sm leading-tight">
                        {r.strong && <strong className="font-display font-extrabold text-base mr-1">{r.strong}</strong>}
                        {r.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {/* The members' own rating, once there are enough reviews. */}
              {rating && (
                <p className="mt-5 inline-flex items-center gap-1.5 text-sm">
                  {[0, 1, 2, 3, 4].map((k) => <Star key={k} size={15} className="text-amber-500" fill={k < Math.round(rating.average) ? "currentColor" : "none"} />)}
                  <strong className="font-display ml-1">{rating.average.toFixed(1).replace(".", ",")}</strong>
                  <span className="opacity-70">/ 5</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Always shown without the navbar (it reports itself through setAuthScreen,
// and AppShell hides the bar), so it carries its own "Accueil" button.
export function AuthPage({ mode }) {
  const { c, nav, notify, t, user, startTour, dark, setAuthScreen } = useApp();
  useEffect(() => { setAuthScreen(true); return () => setAuthScreen(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(mode); // login | register | reset
  const [showPw, setShowPw] = useState(false);
  const [identifier, setIdentifier] = useState(""); // login: username or email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const inp = `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-shadow focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 ${c.inputCls}`;
  // A field's label, above it; `required` adds the red asterisk.
  const Label = ({ htmlFor, children, required = true }) => (
    <label htmlFor={htmlFor} className={`block mb-1.5 text-sm font-semibold ${c.text}`}>
      {children}{required && <span className="text-rose-500"> *</span>}
    </label>
  );
  // The page's main button: solid ink, white on the light theme, as on the
  // reference — the brand gradient stays for the rest of the site.
  const solidBtn = `group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 ${dark ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`;

  const goView = (v) => { setView(v); setLockMsg(""); setNotice(""); };

  // Where a fresh sign-in lands, and whether it's the very first one for this
  // account — shared by login, register (no email confirmation needed) and
  // enter() (register WITH confirmation, once the code is verified), so the
  // three can't drift apart on where "first login" actually routes to.
  // Staff always land on "admin" regardless, and never start the tour — an
  // admin/owner account is never the brand-new candidate it's written for.
  // An account whose profile is still to complete (signed up with only an
  // address and a password) goes to the dashboard, where the profile popup
  // waits; the tour then starts when that popup is done (completeOnboarding).
  const landAfterAuth = (authUser) => {
    const isStaffUser = authUser?.admin || authUser?.owner;
    const firstLogin = consumeFirstLogin(authUser?.id);
    if (authUser?.profilePending && !isStaffUser) return nav("dashboard", { replace: true });
    nav(isStaffUser ? "admin" : firstLogin ? "exams" : "dashboard", { replace: true });
    if (firstLogin && !isStaffUser) startTour();
  };

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
        landAfterAuth(r.user);
      } else if (view === "register") {
        // Only the address and the password here; first name, username,
        // country and the terms come in the profile popup once the account
        // is confirmed (Onboarding.jsx).
        const pwCheck = validatePassword(password);
        if (!pwCheck.ok) return notify(t(pwCheck.error), "error");
        const { data, error, needsEmailConfirmation } = await signUp({ email, password });
        if (error) return notify(authErrorMessage(error), "error");
        if (needsEmailConfirmation) setVerify(true);
        else landAfterAuth(mapSupabaseUser(data.session));
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
  const enter = (session) => landAfterAuth(mapSupabaseUser(session));

  const runVerify = async (value) => {
    if (busy || value.length !== CONFIRM_CODE_LENGTH) return;
    setBusy(true);
    try {
      const { session, error } = await verifySignupCode(email, value);
      if (error) return notify(authErrorMessage(error), "error");
      if (!session) return notify(t("Code vérifié, mais la session n'a pas pu s'ouvrir. Connectez-vous."), "error");
      notify(t("Votre compte est activé. Bienvenue !"));
      enter(session);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = (e) => { e.preventDefault(); runVerify(code); };

  // Mistyped the address? Drop the pending sign-up and go back to the form,
  // every field still filled in, so only the address needs retyping.
  const changeEmail = async () => {
    setBusy(true);
    await abandonPendingSignup(email, password);
    setBusy(false);
    setVerify(false);
    setCode("");
    setCooldown(0);
    notify(t("Corrigez votre adresse, puis créez votre compte à nouveau."));
    setTimeout(() => document.getElementById("register-email")?.focus(), 50);
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
    <main className="relative min-h-screen grid lg:grid-cols-2">
      <button type="button" onClick={() => nav("home")}
        className={`absolute top-4 left-4 sm:top-5 sm:left-5 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold shadow-sm transition hover:-translate-x-0.5 ${c.card} ${c.border} ${c.text}`}>
        <ArrowLeft size={16} /> {t("Accueil")}
      </button>
      <SidePanel />
      {/* Anchored from the top, not centred: the login and sign-up forms differ
          in height, and centring shifted every field when switching between
          them. */}
      <div className="flex items-start justify-center px-5 sm:px-10 pb-16 pt-20 lg:pt-[12vh]">
      <div className="w-full max-w-md rise">
        <div className="mb-7">
          <span className="inline-flex items-center gap-2">
            <img src="/logo-mark.svg" alt="" width="36" height="36" className="w-9 h-9 object-contain" />
            <span className="font-display font-extrabold text-lg text-blue-600">Passerelle</span>
          </span>
          {/* Log in / sign up, one click apart. */}
          {(view === "login" || view === "register") && !verify && (
            <div className={`mt-6 flex w-fit p-1 rounded-full ${c.track}`} role="tablist" aria-label={t("Connexion ou inscription")}>
              {[["login", "Connexion"], ["register", "Inscription"]].map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => goView(v)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition ${view === v ? `${c.card} ${c.text} shadow-sm` : c.sub}`}>
                  {t(l)}
                </button>
              ))}
            </div>
          )}
          <h1 className={`font-display font-bold text-3xl mt-5 ${c.text}`}>
            {view === "login"
              ? <>{t("Bon retour")} <span className="grad-text">!</span></>
              : view === "register"
                ? <>{t("Créer votre")} <span className="grad-text">{t("compte")}</span></>
                : t("Réinitialiser le mot de passe")}
          </h1>
          <p className={`text-sm mt-2 ${c.sub}`}>
            {view === "login" ? t("Reprenez votre préparation là où vous l'avez laissée.") : view === "register" ? t("Gratuit, sans carte bancaire. Prêt en 30 secondes.") : t("Entrez votre adresse email : nous vous enverrons un lien sécurisé.")}
          </p>
        </div>
        {verify ? (
          <form className="text-center py-4 rise" onSubmit={submitCode}>
            <Mail size={36} className="text-blue-600 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Entrez votre code de confirmation")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t(`Nous avons envoyé un code à ${CONFIRM_CODE_LENGTH} chiffres à`)} <span className="font-semibold">{email || t("votre adresse")}</span>.</p>
            {/* Verifies itself on the sixth digit — the button stays for anyone
                who lands there by paste or autofill and expects to confirm. */}
            <CodeInput
              value={code}
              onChange={setCode}
              onComplete={runVerify}
              disabled={busy}
              length={CONFIRM_CODE_LENGTH}
              label={t("Code de confirmation")}
            />
            <button type="submit" className={`mt-4 ${solidBtn}`} disabled={busy || code.length !== CONFIRM_CODE_LENGTH}>
              {t(busy ? "Vérification…" : "Activer mon compte")}
            </button>
            <button type="button" onClick={resend} disabled={busy || cooldown > 0} className={`mt-4 text-sm font-semibold ${cooldown > 0 ? c.faint : "text-blue-600"} disabled:cursor-not-allowed`}>
              {cooldown > 0 ? `${t("Renvoyer le code dans")} ${cooldown} s` : t("Je n'ai rien reçu — renvoyer le code")}
            </button>
            <p className={`mt-3 text-xs ${c.faint}`}>{t("Pensez à regarder dans vos courriels indésirables.")}</p>
            <p className={`mt-4 pt-4 border-t text-sm ${c.border} ${c.sub}`}>
              {t("Ce n'est pas la bonne adresse ?")}{" "}
              <button type="button" onClick={changeEmail} disabled={busy} className="font-semibold text-blue-600 hover:underline disabled:opacity-50">
                {t("Modifier mon adresse")}
              </button>
            </p>
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
                <button type="button" disabled={busy} onClick={google} className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-full border text-sm font-semibold ${c.inputCls} ${c.hoverSoft} disabled:opacity-60`}>
                  <GoogleIcon /> {t("Continuer avec Google")}
                </button>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 border-t ${c.border}`} />
                  <span className={`text-xs font-semibold uppercase ${c.faint}`}>{t("ou")}</span>
                  <div className={`flex-1 border-t ${c.border}`} />
                </div>
              </>
            )}
            {view === "login" ? (
              <div>
                <Label htmlFor="login-identifier">{t("Nom d'utilisateur ou adresse email")}</Label>
                <input id="login-identifier" autoComplete="username" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setLockMsg(""); setNotice(""); }} className={inp} />
              </div>
            ) : (
              <div>
                <Label htmlFor="register-email">{t("Adresse email")}</Label>
                <input id="register-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
              </div>
            )}
            {view !== "reset" && (
              <div>
                <Label htmlFor="auth-password">{view === "login" ? t("Mot de passe") : t("Créez votre mot de passe")}</Label>
                <div className="relative">
                  <input id="auth-password" type={showPw ? "text" : "password"} autoComplete={view === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inp} pr-11`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                {/* Only while choosing a password — scoring the one being typed
                    at login would leak how strong the stored password is. */}
                {view === "register" && <PasswordMeter password={password} email={email} />}
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
            <button type="submit" className={solidBtn} disabled={busy}>
              {view === "login" ? t("Se connecter") : view === "register" ? t("Créer mon compte") : t("Envoyer le lien")}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className={`pt-2 text-center text-sm ${c.sub}`}>
              {view === "login" ? (<>{t("Pas encore de compte ?")} <button type="button" onClick={() => goView("register")} className={`font-semibold underline underline-offset-2 hover:text-blue-600 ${c.text}`}>{t("S'inscrire")}</button></>) : (<>{t("Déjà inscrit·e ?")} <button type="button" onClick={() => goView("login")} className={`font-semibold underline underline-offset-2 hover:text-blue-600 ${c.text}`}>{t("Se connecter")}</button></>)}
            </p>
          </form>
        )}
      </div>
      </div>
    </main>
  );
}
