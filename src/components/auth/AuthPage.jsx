import { useEffect, useState } from "react";
import { Leaf, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { signIn, signUp, resetPassword, signInWithGoogle } from "@/services/authService";

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
  const { c, nav, notify } = useApp();
  const [view, setView] = useState(mode); // login | register | reset
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setView(mode), [mode]);
  const inp = `w-full pl-11 pr-11 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const submit = async () => {
    setBusy(true);
    try {
      if (view === "login") {
        const { error } = await signIn({ email, password });
        if (error) return notify(error.message);
        notify("Bon retour parmi nous !");
        nav("dashboard");
      } else if (view === "register") {
        const { error, needsEmailConfirmation } = await signUp({ name, email, password });
        if (error) return notify(error.message);
        if (needsEmailConfirmation) setVerify(true);
        else nav("dashboard");
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
    const { error } = await signInWithGoogle();
    if (error) { notify(error.message); setBusy(false); }
    // on success the browser redirects to Google, so no further state change here
  };

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Leaf size={22} /></span>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>
            {view === "login" ? "Bon retour !" : view === "register" ? "Créer votre compte" : "Réinitialiser le mot de passe"}
          </h1>
          <p className={`text-sm mt-1.5 ${c.sub}`}>
            {view === "login" ? "Reprenez votre préparation là où vous l'avez laissée." : view === "register" ? "Gratuit, sans carte bancaire. Prêt en 30 secondes." : "Entrez votre courriel : nous vous enverrons un lien sécurisé."}
          </p>
        </div>
        {verify ? (
          <div className="text-center py-6 rise">
            <Mail size={36} className="text-blue-600 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>Vérifiez votre boîte de réception</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>Un courriel de confirmation a été envoyé à <span className="font-semibold">{email || "votre adresse"}</span>. Cliquez sur le lien pour activer votre compte.</p>
          </div>
        ) : resetSent ? (
          <div className="text-center py-6 rise">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>Lien envoyé</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>Si un compte existe pour cette adresse, un lien de réinitialisation valide 30 minutes vient d'être envoyé.</p>
            <Btn variant="ghost" className="mt-6 w-full" onClick={() => { setResetSent(false); setView("login"); }}>Retour à la connexion</Btn>
          </div>
        ) : (
          <div className="space-y-4">
            {view !== "reset" && (
              <>
                <button type="button" disabled={busy} onClick={google} className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border text-sm font-semibold ${c.inputCls} ${c.hoverSoft} disabled:opacity-60`}>
                  <GoogleIcon /> Continuer avec Google
                </button>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 border-t ${c.border}`} />
                  <span className={`text-xs ${c.faint}`}>ou</span>
                  <div className={`flex-1 border-t ${c.border}`} />
                </div>
              </>
            )}
            {view === "register" && (
              <div className="relative">
                <User size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                <input placeholder="Prénom" aria-label="Prénom" value={name} onChange={(e) => setName(e.target.value)} className={inp} />
              </div>
            )}
            <div className="relative">
              <Mail size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
              <input placeholder="Courriel" aria-label="Courriel" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
            </div>
            {view !== "reset" && (
              <div className="relative">
                <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input placeholder="Mot de passe" aria-label="Mot de passe" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
                <button onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Masquer" : "Afficher"} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            )}
            {view === "login" && (
              <div className="flex justify-end -mt-1">
                <button onClick={() => setView("reset")} className="text-xs font-semibold text-blue-600 hover:underline">Mot de passe oublié ?</button>
              </div>
            )}
            <Btn className="w-full" variant="accent" disabled={busy} onClick={submit}>
              {view === "login" ? "Se connecter" : view === "register" ? "Créer mon compte" : "Envoyer le lien"}
            </Btn>
            <p className={`text-center text-sm ${c.sub}`}>
              {view === "login" ? (<>Pas encore de compte ? <button onClick={() => setView("register")} className="font-semibold text-blue-600 hover:underline">S'inscrire</button></>) : (<>Déjà inscrit·e ? <button onClick={() => setView("login")} className="font-semibold text-blue-600 hover:underline">Se connecter</button></>)}
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}
