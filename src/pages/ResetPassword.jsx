import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { verifyRecoveryToken, updatePassword, authErrorMessage, validatePassword, MIN_PASSWORD } from "@/services/authService";
import { PasswordMeter } from "@/components/auth/PasswordMeter";

// Landing page for the "choose a new password" link in the reset email.
//
// The link carries ?token_hash=…&type=recovery and points HERE rather than at
// Supabase's /auth/v1/verify. Recovery tokens are single-use and mail scanners
// fetch every link they see, so a Supabase-hosted link is routinely spent
// before the user clicks it ("otp_expired"). A scanner fetching this page only
// gets HTML — the token is redeemed below in JavaScript, which scanners don't
// execute. See docs/email-templates/README.md.
//
// Three states: verifying the token, the password form, done. A dead link ends
// on an explanation plus a way to request a fresh one — never a blank redirect.

export function ResetPassword() {
  const { c, nav, notify, t } = useApp();
  const [state, setState] = useState("verifying"); // verifying | ready | done | invalid
  const [problem, setProblem] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");

    // Links minted before this page existed (and Supabase's own error replies)
    // come back on the URL fragment instead. Read it so those users get the
    // real reason rather than a silent bounce to the homepage.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashError = hash.get("error_description") || hash.get("error");

    const fail = (msg) => { setProblem(msg); setState("invalid"); };

    if (hashError && !tokenHash) {
      return fail(/expired|invalid/i.test(hashError)
        ? "Ce lien a expiré ou a déjà été utilisé."
        : decodeURIComponent(hashError.replace(/\+/g, " ")));
    }
    if (!tokenHash) return fail("Ce lien est incomplet. Ouvrez-le directement depuis le courriel reçu.");

    let cancelled = false;
    verifyRecoveryToken(tokenHash).then(({ error }) => {
      if (cancelled) return;
      if (error) return fail("Ce lien a expiré ou a déjà été utilisé.");
      // Strip the token from the address bar: it is spent, and it has no
      // business sitting in history or in a shared screenshot.
      window.history.replaceState({}, "", window.location.pathname);
      setState("ready");
    });
    return () => { cancelled = true; };
  }, []);

  const submit = async (e) => {
    e?.preventDefault();
    const check = validatePassword(password);
    if (!check.ok) return notify(t(check.error), "error");
    if (password !== confirm) return notify(t("Les deux mots de passe ne correspondent pas."), "error");
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) return notify(authErrorMessage(error), "error");
    setState("done");
  };

  const inp = `w-full pl-11 pr-11 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Lock size={20} /></span>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>{t("Nouveau mot de passe")}</h1>
        </div>

        {state === "verifying" && (
          <div className="text-center py-8">
            <Loader2 size={28} className="mx-auto text-blue-600 animate-spin" />
            <p className={`mt-4 text-sm ${c.sub}`}>{t("Vérification du lien…")}</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="text-center py-4 rise">
            <AlertTriangle size={34} className="text-rose-500 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Lien inutilisable")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t(problem)}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t("Demandez-en un nouveau : il reste valable 30 minutes.")}</p>
            <Btn variant="accent" className="mt-6 w-full" onClick={() => nav("login")}>{t("Demander un nouveau lien")}</Btn>
          </div>
        )}

        {state === "done" && (
          <div className="text-center py-4 rise">
            <CheckCircle2 size={34} className="text-emerald-500 mx-auto" />
            <p className={`mt-4 font-semibold ${c.text}`}>{t("Mot de passe modifié")}</p>
            <p className={`mt-1.5 text-sm ${c.sub}`}>{t("Vous pouvez désormais vous connecter avec votre nouveau mot de passe.")}</p>
            <Btn variant="accent" className="mt-6 w-full" onClick={() => nav("dashboard")}>{t("Continuer")}</Btn>
          </div>
        )}

        {state === "ready" && (
          <form className="space-y-4" onSubmit={submit}>
            <p className={`text-sm text-center ${c.sub}`}>{t(`Choisissez un mot de passe d'au moins ${MIN_PASSWORD} caractères.`)}</p>
            {/* Meter outside the relative wrapper, so the taller box doesn't
                re-centre the `top-1/2` icons onto the bar. */}
            <div>
              <div className="relative">
                <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
                <input placeholder={t("Nouveau mot de passe")} aria-label={t("Nouveau mot de passe")} type={showPw ? "text" : "password"}
                  autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              <PasswordMeter password={password} />
            </div>
            <div className="relative">
              <Lock size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 ${c.faint}`} aria-hidden="true" />
              <input placeholder={t("Confirmer le mot de passe")} aria-label={t("Confirmer le mot de passe")} type={showPw ? "text" : "password"}
                autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inp} />
              {confirm && (
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${password === confirm ? "text-emerald-500" : "text-rose-500"}`} aria-hidden="true">
                  {password === confirm ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                </span>
              )}
            </div>
            <Btn type="submit" className="w-full" variant="accent" disabled={busy}>{t("Enregistrer le mot de passe")}</Btn>
          </form>
        )}
      </Card>
    </main>
  );
}
