import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  User, AtSign, Mail, Lock, Eye, EyeOff, Crown, CreditCard, Moon, Sun,
  CalendarDays, LogOut, Check, Shield, Quote, X, Trash2, AlertTriangle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { ROLES, isStaff } from "@/auth/rbac";
import { currentPlanLabel } from "@/constants/pricing";
import {
  getProfile, updateDisplayName, updateUsername, updatePassword,
  isValidName, isValidUsername, isUsernameAvailable, normalizeName, validatePassword,
} from "@/services/authService";
import { PasswordMeter } from "@/components/auth/PasswordMeter";
import {
  listMyTestimonials, submitTestimonial, deleteTestimonial, MIN_BODY, MAX_BODY,
} from "@/services/testimonialsService";
import { listMyThreads, markRepliesRead } from "@/services/supportService";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "—");

function ProfileSection({ icon: Icon, title, desc, children }) {
  const { c } = useApp();
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={18} /></span>
        <div>
          <h3 className={`font-display font-bold ${c.text}`}>{title}</h3>
          {desc && <p className={`text-sm ${c.sub}`}>{desc}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function Profile() {
  const { c, user, role, nav, notify, dark, setDark, signOut, t } = useApp();
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [createdAt, setCreatedAt] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);


  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return;
      setUsername(p.username || "");
      setInitialUsername(p.username || "");
      setCreatedAt(p.createdAt);
    });
  }, []);

  const isPremium = role === ROLES.PREMIUM_USER || (isStaff(role) && user.plan === "Premium");

  const saveProfile = async () => {
    // Compared normalized so re-saving "Jean  Luc" over the stored "Jean Luc"
    // counts as no change rather than a pointless write.
    const nameChanged = normalizeName(name) !== normalizeName(user.name);
    const uChanged = username.trim().toLowerCase() !== initialUsername;
    if (!nameChanged && !uChanged) return notify(t("Aucune modification à enregistrer."));
    if (nameChanged && !isValidName(name)) return notify(t("Prénom : 2 à 40 caractères, lettres uniquement (accents, - et ' acceptés)."));
    setSavingProfile(true);
    try {
      if (uChanged) {
        if (!isValidUsername(username)) return notify(t("Nom d'utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)."));
        if (!(await isUsernameAvailable(username))) return notify(t("Ce nom d'utilisateur est déjà pris."));
        const { error } = await updateUsername(username);
        if (error) return notify(error.message);
        setInitialUsername(username.trim().toLowerCase());
      }
      if (nameChanged) {
        const { error } = await updateDisplayName(name);
        if (error) return notify(error.message);
      }
      notify(t("Profil mis à jour."));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    const check = validatePassword(pw);
    if (!check.ok) return notify(t(check.error));
    if (pw !== pw2) return notify(t("Les deux mots de passe ne correspondent pas."));
    setSavingPw(true);
    try {
      const { error } = await updatePassword(pw);
      if (error) return notify(error.message);
      setPw(""); setPw2("");
      notify(t("Mot de passe mis à jour."));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <PageShell back eyebrow={t("Mon compte")} title={t("Profil et paramètres")} sub={t("Gérez vos informations, votre abonnement et vos préférences.")}>
      {/* identity header */}
      <Card className="p-6 mb-5 flex items-center gap-5">
        <span className="w-16 h-16 rounded-full grad-brand text-white text-2xl font-bold flex items-center justify-center shrink-0">{(user.name || "?")[0].toUpperCase()}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`font-display font-bold text-xl ${c.text}`}>{user.name}</h2>
            {user.owner && <Pill tone="amber"><Shield size={12} /> Owner</Pill>}
            {user.admin && <Pill tone="blue"><Shield size={12} /> Admin</Pill>}
            {isPremium ? <Pill tone="blue"><Crown size={12} /> {currentPlanLabel(user.planLabel) || "Premium"}</Pill> : <Pill tone="slate">{t("Basic")}</Pill>}
          </div>
          {initialUsername && <p className={`text-sm ${c.sub}`}>@{initialUsername}</p>}
          <p className={`text-sm ${c.faint}`}>{user.email}</p>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* personal info */}
        <ProfileSection icon={User} title={t("Informations personnelles")} desc={t("Votre nom et votre identifiant de connexion.")}>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Prénom")}</label>
              <div className="relative mt-1.5">
                <User size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("Prénom")} className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Nom d'utilisateur")}</label>
              <div className="relative mt-1.5">
                <AtSign size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={username} onChange={(e) => setUsername(e.target.value)} aria-label={t("Nom d'utilisateur")} className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${c.sub}`}>{t("Courriel")}</label>
              <div className="relative mt-1.5">
                <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input value={user.email} disabled aria-label={t("Courriel")} className={`${inp} pl-10 opacity-60 cursor-not-allowed`} />
              </div>
            </div>
            <Btn small icon={Check} disabled={savingProfile} onClick={saveProfile}>{t(savingProfile ? "Enregistrement…" : "Enregistrer")}</Btn>
          </div>
        </ProfileSection>

        {/* security */}
        <ProfileSection icon={Lock} title={t("Sécurité")} desc={t("Changez votre mot de passe à tout moment.")}>
          <div className="space-y-3">
            {/* The meter sits OUTSIDE the relative wrapper: inside it, the
                taller box would re-centre the `top-1/2` icons onto the bar. */}
            <div>
              <div className="relative">
                <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
                <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("Nouveau mot de passe")} aria-label={t("Nouveau mot de passe")} autoComplete="new-password" className={`${inp} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? t("Masquer") : t("Afficher")} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${c.faint} hover:text-blue-600`}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <PasswordMeter password={pw} email={user.email} username={initialUsername} />
            </div>
            <div className="relative">
              <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
              <input type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t("Confirmer le mot de passe")} aria-label={t("Confirmer le mot de passe")} autoComplete="new-password" className={`${inp} pl-10 pr-10`} />
              {pw2 && (
                <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${pw === pw2 ? "text-emerald-500" : "text-rose-500"}`} aria-hidden="true">
                  {pw === pw2 ? <Check size={16} /> : <X size={16} />}
                </span>
              )}
            </div>
            <Btn small variant="ghost" disabled={savingPw || !pw} onClick={changePassword}>{savingPw ? "…" : t("Mettre à jour le mot de passe")}</Btn>
          </div>
        </ProfileSection>

        {/* subscription */}
        <ProfileSection icon={CreditCard} title={t("Abonnement")} desc={t(isPremium ? "Votre forfait Premium est actif." : "Vous utilisez le forfait gratuit Basic.")}>
          {isPremium ? (
            <div className="space-y-3">
              <div className={`p-4 rounded-2xl bg-blue-600/10`}>
                <p className={`font-semibold ${c.text} flex items-center gap-2`}><Crown size={16} className="text-blue-600" /> {currentPlanLabel(user.planLabel) || "Premium"}</p>
                {user.premiumUntil && <p className={`text-sm mt-1 ${c.sub}`}>{t("Fin de votre accès :")} {t(fmtDate(user.premiumUntil))}</p>}
              </div>
              {/* No billing-portal button: a pass is a single purchase (CGU s.6)
                  — there is no card on file to update, no renewal to cancel and
                  no subscription to manage. Offering the portal here promised
                  all three and led to a dead end. */}
              <p className={`text-xs ${c.faint}`}>{t("Votre pass est un achat unique : rien n'est reconduit et aucun prélèvement n'aura lieu à l'échéance. Votre reçu vous a été envoyé par courriel au moment du paiement.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-sm ${c.sub}`}>{t("Passez à Premium pour débloquer tous les modules, les TCF blancs complets et l'analyse IA.")}</p>
              <Btn small variant="accent" icon={Crown} onClick={() => nav("pricing")}>{t("Passer à Premium")}</Btn>
            </div>
          )}
        </ProfileSection>

        {/* preferences + account */}
        <ProfileSection icon={CalendarDays} title={t("Préférences et compte")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${c.text} flex items-center gap-2`}>{dark ? <Moon size={16} /> : <Sun size={16} />} {t("Thème sombre")}</span>
              <button role="switch" aria-checked={dark} aria-label={t("Thème sombre")} onClick={() => setDark(!dark)} className={`w-11 h-6 rounded-full transition-colors relative ${dark ? "bg-blue-600" : c.track}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className={`flex items-center justify-between text-sm ${c.sub}`}>
              <span className="flex items-center gap-2"><CalendarDays size={16} /> {t("Membre depuis")}</span>
              <span className="font-mono2">{t(fmtDate(createdAt))}</span>
            </div>
            <div className={`pt-2 border-t ${c.border}`}>
              <Btn small variant="ghost" icon={LogOut} className="text-rose-600" onClick={() => { signOut(); nav("home"); notify(t("Vous êtes déconnecté·e. À bientôt !")); }}>{t("Se déconnecter")}</Btn>
            </div>
          </div>
        </ProfileSection>

        {/* conversations with the team — only rendered when there are any */}
        <div className="lg:col-span-2"><SupportSection /></div>

        {/* success story — submitted here, published on the landing page only
            once an admin approves it */}
        <div className="lg:col-span-2"><TestimonialSection /></div>

        <div className="lg:col-span-2"><DeleteAccountSection /></div>
      </div>
    </PageShell>
  );
}

/* ------------------------------ delete account ---------------------------- */

// Facebook-style: deleting deactivates the account now and erases it 7 days
// later unless the member signs back in (api/_lib/public/account.js). Typing a
// word rather than the password, because Google accounts don't have one.
const CONFIRM_WORD = "SUPPRIMER";

function DeleteAccountSection() {
  const { c, user, deactivateAccount, notify, t } = useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = user.admin || user.owner;

  const close = () => { if (busy) return; setOpen(false); setTyped(""); };
  const confirm = async () => {
    setBusy(true);
    const r = await deactivateAccount();
    // On success the page is already gone (signed out, back home), so only a
    // failure needs handling here.
    if (!r.ok) { setBusy(false); notify(t(r.error)); }
  };

  return (
    <ProfileSection icon={Trash2} title={t("Supprimer mon compte")} desc={t("Votre compte sera désactivé immédiatement, puis supprimé définitivement après 7 jours.")}>
      {staff ? (
        <p className={`text-sm ${c.sub}`}>{t("Un compte administrateur ne peut pas être supprimé depuis le profil.")}</p>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${c.sub}`}>{t("Votre progression, vos résultats et votre historique seront effacés. Si vous vous reconnectez dans les 7 jours, la suppression est annulée.")}</p>
          <Btn small variant="ghost" icon={Trash2} className="text-rose-600" onClick={() => setOpen(true)}>{t("Supprimer mon compte")}</Btn>
        </div>
      )}

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={close} className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border ${c.border} ${c.card} p-7 shadow-2xl rise`}>
            <span className="w-14 h-14 rounded-full bg-rose-600/10 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle size={26} /></span>
            <h3 id="delete-title" className={`mt-4 text-center font-display font-bold text-lg ${c.text}`}>{t("Supprimer votre compte ?")}</h3>
            <ul className={`mt-3 space-y-1.5 text-sm ${c.sub} list-disc pl-5`}>
              <li>{t("Votre compte est désactivé tout de suite et vous êtes déconnecté·e de tous vos appareils.")}</li>
              <li>{t("Il sera supprimé définitivement dans 7 jours, avec toutes vos données.")}</li>
              <li>{t("Vous reconnecter avant cette date annule la suppression.")}</li>
              {user.plan === "Premium" && <li>{t("Votre accès Premium en cours sera perdu.")}</li>}
            </ul>
            <label className={`block mt-4 text-xs font-semibold ${c.sub}`}>
              {t("Pour confirmer, tapez")} <span className="font-mono2 text-rose-600">{CONFIRM_WORD}</span>
            </label>
            <input
              autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={t("Confirmation")}
              className={`mt-1.5 w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-rose-600 ${c.inputCls}`}
            />
            <div className="mt-5 flex gap-3">
              <Btn small variant="ghost" className="flex-1" disabled={busy} onClick={close}>{t("Annuler")}</Btn>
              <button
                disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD} onClick={confirm}
                className="flex-1 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >{t(busy ? "Suppression…" : "Supprimer mon compte")}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ProfileSection>
  );
}

/* --------------------------- messages with the team ----------------------- */

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// The member's own contact threads: what they wrote to us, and what we
// answered. Only messages sent while signed in appear here — one sent as a
// visitor belongs to no account and is answered by email (see supportService).
//
// The section renders nothing at all when there is no conversation: an empty
// "Mes messages" card on every profile would be noise for the vast majority of
// members, who never write to us.
function SupportSection() {
  const { c, user, t } = useApp();
  const [threads, setThreads] = useState(null);

  useEffect(() => {
    let live = true;
    listMyThreads(user?.id).then((r) => {
      if (!live) return;
      setThreads(r.threads);
      // Opening the page IS reading them. Marking here (rather than on a click)
      // is what clears the nav bell, and the bell is what brought them here.
      const unread = r.threads.flatMap((th) => th.replies.filter((rep) => !rep.readAt).map((rep) => rep.id));
      if (unread.length) markRepliesRead(unread);
    });
    return () => { live = false; };
  }, [user?.id]);

  if (!threads?.length) return null;

  return (
    <div id="mes-messages">
      <ProfileSection icon={Mail} title={t("Mes messages")} desc={t("Vos échanges avec notre équipe.")}>
        <div className="space-y-4">
          {threads.map((th) => (
            <div key={th.id} className={`rounded-2xl border ${c.border} p-4`}>
              <div className="flex items-center gap-2 flex-wrap">
                {th.subject && <p className={`text-sm font-semibold ${c.text}`}>{th.subject}</p>}
                <span className={`text-xs ${c.faint}`}>{t(fmtDateTime(th.createdAt))}</span>
                {th.replies.some((r) => !r.readAt) && <Pill tone="blue">{t("Nouvelle réponse")}</Pill>}
              </div>
              <p className={`text-sm mt-1.5 whitespace-pre-wrap ${c.sub}`}>{th.message}</p>

              {th.replies.length === 0 ? (
                <p className={`text-xs mt-3 ${c.faint}`}>
                  {t("Message bien reçu. Notre équipe vous répond ici même, et par courriel.")}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {th.replies.map((r) => (
                    <div key={r.id} className="pl-3 border-l-2 border-blue-600/50">
                      <p className={`text-xs font-semibold text-blue-600`}>{t("Réponse de l'équipe Passerelle TCF")}</p>
                      <p className={`text-sm mt-1 whitespace-pre-wrap ${c.text}`}>{r.body}</p>
                      <p className={`text-xs mt-1 ${c.faint}`}>{t(fmtDateTime(r.createdAt))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ProfileSection>
    </div>
  );
}

const STATUS_PILL = {
  pending: { tone: "amber", label: "En attente de validation" },
  approved: { tone: "green", label: "Publié sur l'accueil" },
  rejected: { tone: "red", label: "Non retenu" },
};

const LEVELS = ["", "A2 obtenu", "B1 obtenu", "B2 obtenu", "C1 obtenu", "C2 obtenu"];

// Lets a member write one success story and follow its moderation status. The
// story is never published directly: it lands as `pending` (enforced by RLS,
// not just by this form) and an admin decides.
function TestimonialSection() {
  const { c, user, notify, t } = useApp();
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const [mine, setMine] = useState(null); // null = loading, [] = none yet
  const [body, setBody] = useState("");
  const [origin, setOrigin] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => listMyTestimonials().then((r) => setMine(r.items));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setBusy(true);
    const r = await submitTestimonial({ name: user.name, origin, level, body });
    setBusy(false);
    if (!r.ok) return notify(t(r.error || "Envoi impossible pour le moment."));
    setBody(""); setOrigin(""); setLevel("");
    notify(t("Merci ! Votre témoignage sera publié après validation."));
    load();
  };

  const withdraw = async (id) => {
    const r = await deleteTestimonial(id);
    notify(t(r.ok ? "Témoignage retiré." : "Suppression refusée."));
    load();
  };

  const remaining = MAX_BODY - body.trim().length;
  const tooShort = body.trim().length > 0 && body.trim().length < MIN_BODY;

  return (
    <ProfileSection icon={Quote} title={t("Mon témoignage")} desc={t("Racontez votre parcours. Après validation par notre équipe, il apparaîtra sur la page d'accueil.")}>
      {mine === null ? (
        <div className={`h-24 rounded-2xl animate-pulse ${c.track}`} aria-hidden="true" />
      ) : (
        <div className="space-y-4">
          {mine.map((tm) => {
            const st = STATUS_PILL[tm.status] || STATUS_PILL.pending;
            return (
              <div key={tm.id} className={`p-4 rounded-2xl border ${c.border}`}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Pill tone={st.tone}>{t(st.label)}</Pill>
                  {tm.level && <Pill tone="slate">{tm.level}</Pill>}
                  <span className={`text-xs ${c.faint}`}>{fmtDate(tm.createdAt)}</span>
                </div>
                <p className={`text-sm leading-relaxed ${c.sub}`}>« {tm.body} »</p>
                <button onClick={() => withdraw(tm.id)} className="mt-3 text-xs font-semibold text-rose-600 hover:underline">{t("Retirer")}</button>
              </div>
            );
          })}

          {/* One story at a time keeps the moderation queue honest; withdrawing
              the current one frees the form again. */}
          {mine.length === 0 ? (
            <>
              <div>
                <label className={`text-xs font-semibold ${c.sub}`}>{t("Votre témoignage")}</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))} rows={4}
                  placeholder={t("Ex. : en 8 semaines, je suis passé·e de B1 à C1 en compréhension orale…")}
                  aria-label={t("Votre témoignage")} className={`${inp} mt-1.5 resize-y`} />
                <p className={`mt-1 text-xs ${tooShort ? "text-amber-600" : c.faint}`}>
                  {tooShort ? t(`Encore ${MIN_BODY - body.trim().length} caractères minimum.`) : t(`${remaining} caractères restants.`)}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${c.sub}`}>{t("Votre parcours")}</label>
                  <input value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={80} placeholder={t("Ex. : Casablanca → Montréal")}
                    aria-label={t("Votre parcours")} className={`${inp} mt-1.5`} />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${c.sub}`}>{t("Résultat obtenu")}</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label={t("Résultat obtenu")} className={`${inp} mt-1.5`}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l || t("Ne pas préciser")}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Btn small icon={Check} disabled={busy || body.trim().length < MIN_BODY} onClick={submit}>{t(busy ? "Envoi…" : "Envoyer pour validation")}</Btn>
                <span className={`text-xs ${c.faint}`}>{t("Publié sous le nom")} « {user.name} »</span>
              </div>
            </>
          ) : (
            <p className={`text-xs ${c.faint}`}>{t("Retirez votre témoignage actuel pour en écrire un nouveau.")}</p>
          )}
        </div>
      )}
    </ProfileSection>
  );
}
