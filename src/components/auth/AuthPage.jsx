import { useEffect, useState } from "react";
import { Leaf, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { signIn, signUp, resetPassword } from "@/services/authService";

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
