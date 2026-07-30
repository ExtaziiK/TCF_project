import { useState } from "react";
import { AlertTriangle, ScrollText } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { TermsConsent } from "@/components/auth/TermsConsent";
import { recordTermsAcceptance } from "@/services/termsService";
import { TERMS_UPDATED } from "@/constants/terms";

// Shown as a full-page gate to a signed-in account whose accepted version is
// behind the published one (see useTermsGate). Reuses the signup consent block,
// so the conditions still have to be opened and scrolled before the box can be
// ticked, and records the acceptance in the same append-only table.
//
// Refusing is a real option: an account that will not accept can sign out and
// keeps everything it already has. Nothing is deleted here.
export function TermsGate({ onAccepted }) {
  const { c, signOut, notify, t } = useApp();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!accepted) return setError(t("Vous devez lire et accepter les conditions générales pour continuer."));
    setBusy(true);
    try {
      const r = await recordTermsAcceptance("reacceptance");
      // If consent cannot be stored at all (migration not applied), let the user
      // through anyway. A gate that refuses the only action it offers is a
      // locked door, and the acceptance is asked again on the next visit once
      // there is somewhere to record it.
      if (!r.ok && !r.unavailable) return setError(t("Enregistrement refusé. Réessayez."));
      if (r.ok) notify(t("Merci — votre acceptation a bien été enregistrée."));
      onAccepted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pt-28 md:pt-36 pb-20 px-4 min-h-screen">
      <Card className="max-w-md mx-auto p-8 shadow-2xl shadow-blue-600/10 rise">
        <div className="text-center mb-7">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600">
            <ScrollText size={26} aria-hidden="true" />
          </span>
          <h1 className={`font-display font-bold text-2xl mt-4 ${c.text}`}>{t("Nos conditions générales ont changé")}</h1>
          <p className={`text-sm mt-1.5 ${c.sub}`}>
            {t("Merci de les lire et de les accepter pour continuer à utiliser votre compte.")}{" "}
            {t("Dernière mise à jour :")} {TERMS_UPDATED}.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <TermsConsent accepted={accepted} onChange={(v) => { setAccepted(v); setError(""); }} />
          {error && (
            <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/30 rise">
              <p className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" />{error}</p>
            </div>
          )}
          <Btn type="submit" className="w-full" variant="accent" disabled={busy}>
            {busy ? t("Enregistrement…") : t("J'accepte et je continue")}
          </Btn>
          <button type="button" onClick={signOut} className={`w-full text-center text-sm ${c.faint} hover:underline`}>
            {t("Se déconnecter")}
          </button>
        </form>
      </Card>
    </main>
  );
}
