import { useState } from "react";
import { Lock, Plus, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { CodeInput } from "@/components/auth/CodeInput";
import { createProfile, verifyPin, PIN_LENGTH, PROFILE_ACCENTS } from "@/services/profileService";

// Avatar tints, indexed by the profile's `accent`. Drawn from the brand ramp so
// a family of profiles still looks like this site.
const ACCENTS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-violet-700",
  "from-rose-500 to-rose-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-slate-500 to-slate-700",
];

function Avatar({ profile, size = "w-24 h-24 text-3xl" }) {
  return (
    <span className={`${size} rounded-3xl bg-gradient-to-br ${ACCENTS[profile.accent % PROFILE_ACCENTS]} text-white font-display font-bold flex items-center justify-center shadow-lg`}>
      {profile.name.trim()[0]?.toUpperCase() || "?"}
    </span>
  );
}

// Shown after login, before the app, when the account has more than one profile
// (or one that is PIN-locked). A single unlocked profile never reaches here —
// AppProvider selects it silently, so accounts without profiles notice nothing.
export function ProfileGate({ profiles, canAdd, onPick, onCreated }) {
  const { c, t, notify } = useApp();
  const [pinFor, setPinFor] = useState(null); // profile awaiting its PIN
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState(0);
  const [newPin, setNewPin] = useState("");

  const choose = (p) => {
    if (!p.locked) return onPick(p);
    setPin("");
    setPinFor(p);
  };

  const submitPin = async (value) => {
    if (busy || value.length !== PIN_LENGTH) return;
    setBusy(true);
    try {
      if (await verifyPin(pinFor.id, value)) return onPick(pinFor);
      setPin("");
      notify(t("Code incorrect."), "error");
    } finally {
      setBusy(false);
    }
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await createProfile({ name, accent, pin: newPin });
      if (!r.ok) return notify(r.error, "error");
      setAdding(false);
      setName("");
      setNewPin("");
      onCreated(r.profile);
    } finally {
      setBusy(false);
    }
  };

  const back = () => { setPinFor(null); setAdding(false); setPin(""); };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-3xl text-center">
        {pinFor ? (
          <>
            <Avatar profile={pinFor} size="w-20 h-20 text-2xl mx-auto" />
            <h1 className={`font-display font-bold text-2xl mt-5 ${c.text}`}>{pinFor.name}</h1>
            <p className={`mt-2 text-sm ${c.sub}`}>{t("Entrez le code de ce profil.")}</p>
            <div className="max-w-xs mx-auto">
              {/* Same component as the signup confirmation code: one input under
                  the boxes, so paste and the numeric keypad behave. */}
              <CodeInput
                value={pin}
                onChange={setPin}
                onComplete={submitPin}
                disabled={busy}
                length={PIN_LENGTH}
                label={t("Code du profil")}
              />
            </div>
            <button onClick={back} className={`mt-8 inline-flex items-center gap-1.5 text-sm font-semibold ${c.sub}`}>
              <ArrowLeft size={15} /> {t("Retour aux profils")}
            </button>
          </>
        ) : adding ? (
          <form onSubmit={submitNew} className="max-w-sm mx-auto text-left">
            <h1 className={`font-display font-bold text-2xl text-center ${c.text}`}>{t("Nouveau profil")}</h1>
            <label htmlFor="profile-name" className={`block mt-6 text-sm font-semibold ${c.text}`}>{t("Prénom")}</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              autoFocus
              className={`mt-2 w-full p-3 rounded-2xl border text-sm ${c.inputCls}`}
            />
            <p className={`mt-5 text-sm font-semibold ${c.text}`}>{t("Couleur")}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {ACCENTS.map((cls, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAccent(i)}
                  aria-label={`${t("Couleur")} ${i + 1}`}
                  aria-pressed={accent === i}
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${cls} ${accent === i ? "ring-4 ring-blue-500/40" : ""}`}
                />
              ))}
            </div>
            <p className={`mt-5 text-sm font-semibold ${c.text}`}>{t("Code (facultatif)")}</p>
            <p className={`mt-1 text-xs ${c.faint}`}>
              {t("Quatre chiffres pour réserver ce profil. Laissez vide pour l'ouvrir en un clic.")}
            </p>
            <div className="max-w-[13rem]">
              <CodeInput value={newPin} onChange={setNewPin} length={PIN_LENGTH} label={t("Code du profil")} />
            </div>
            <div className="mt-6 flex gap-3">
              <Btn type="submit" variant="accent" disabled={busy}>{t(busy ? "Création…" : "Créer le profil")}</Btn>
              <Btn type="button" variant="ghost" onClick={back}>{t("Annuler")}</Btn>
            </div>
          </form>
        ) : (
          <>
            <h1 className={`font-display font-bold text-3xl ${c.text}`}>{t("Qui apprend aujourd'hui ?")}</h1>
            <p className={`mt-3 text-sm ${c.sub}`}>{t("Chaque profil garde sa propre progression.")}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-6">
              {profiles.map((p) => (
                <button key={p.id} onClick={() => choose(p)} className="group w-28">
                  <span className="relative block">
                    <Avatar profile={p} size="w-24 h-24 text-3xl mx-auto" />
                    {p.locked && (
                      <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                        <Lock size={14} />
                      </span>
                    )}
                  </span>
                  <span className={`block mt-3 text-sm font-semibold truncate ${c.text} group-hover:text-blue-600`}>{p.name}</span>
                </button>
              ))}
              {canAdd && (
                <button onClick={() => setAdding(true)} className="group w-28">
                  <span className={`w-24 h-24 mx-auto rounded-3xl border-2 border-dashed ${c.border} ${c.sub} flex items-center justify-center group-hover:border-blue-600 group-hover:text-blue-600`}>
                    <Plus size={28} />
                  </span>
                  <span className={`block mt-3 text-sm font-semibold ${c.sub}`}>{t("Ajouter")}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
