import { CheckCircle2, Clock, Loader2, Timer, BookOpenCheck, LayoutDashboard, RotateCcw, Sparkles, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { getDzThanks } from "@/utils/dzCheckout";

// Thank-you page — Stripe's success_url (/merci?session_id=…). AppProvider
// reads the session id on load, strips it from the URL, grants the pass and
// reports progress through `checkoutStatus`; this page only shows it.
//
// The DZD checkout (CCP / BaridiMob) lands here too, after « Envoyer » — its
// request is stashed per tab by CheckoutDz (setDzThanks) and shown as "dz":
// received, waiting for the receipt to be checked.
//
// Opened without a payment behind it (a refresh, a bookmark), the status is
// null and the page falls back to the account itself: a Premium account gets
// its pass summary, anyone else a way to the pricing page.

const DZ_METHODS = { ccp: "CCP", baridimob: "BaridiMob" };
// A dinar request stays the page's subject for a few hours in the tab, then
// the page goes back to describing the account.
const DZ_FRESH_MS = 6 * 3600 * 1000;

const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });

const NEXT_STEPS = [
  { route: "mocks", icon: Timer, title: "Passer un TCF blanc", text: "Les quatre épreuves, chronométrées comme le jour J, pour situer votre niveau." },
  { route: "exams", icon: BookOpenCheck, title: "S'entraîner par épreuve", text: "Tous les quiz de compréhension, l'écrit et l'oral corrigés par l'IA." },
  { route: "dashboard", icon: LayoutDashboard, title: "Suivre sa progression", text: "Votre tableau de bord : scores, niveau CECR estimé, points à revoir." },
];

function StatusBadge({ icon: Icon, tone, spin }) {
  const tones = {
    green: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-600/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <span className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${tones[tone]}`}>
      <Icon size={30} className={spin ? "animate-spin" : ""} aria-hidden="true" />
    </span>
  );
}

export function Merci() {
  const { c, nav, user, checkoutStatus } = useApp();
  const firstName = (user?.name || "").split(/\s+/)[0];
  const premium = user?.plan === "Premium";
  const dzStash = getDzThanks();
  const dz = dzStash && Date.now() - (dzStash.at || 0) < DZ_FRESH_MS ? dzStash : null;
  const state = checkoutStatus || (dz ? "dz" : premium ? "active" : "none");

  const head = {
    dz: {
      badge: <StatusBadge icon={CheckCircle2} tone="green" />,
      title: firstName ? `Merci, ${firstName} ! Demande envoyée` : "Merci, votre demande est envoyée !",
      text: (
        <>
          Nous vérifions votre reçu{DZ_METHODS[dz?.method] ? ` ${DZ_METHODS[dz.method]}` : ""}{dz?.amount ? <> de <strong>{dz.amount}</strong></> : null} pour
          le pass <strong>{dz?.plan}</strong>. Votre accès Premium est activé en moins de 15 minutes après vérification,
          et vous recevez une confirmation.
        </>
      ),
    },
    activating: {
      badge: <StatusBadge icon={Loader2} tone="blue" spin />,
      title: "Paiement reçu, merci !",
      text: "Nous activons votre accès Premium. Cela ne prend que quelques secondes.",
    },
    active: {
      badge: <StatusBadge icon={CheckCircle2} tone="green" />,
      title: firstName ? `Merci, ${firstName} !` : "Merci pour votre achat !",
      text: (
        <>
          Votre {user?.planLabel ? <>pass <strong>{user.planLabel}</strong></> : "accès Premium"} est actif
          {user?.premiumUntil ? <> jusqu&apos;au <strong>{fmtDate(user.premiumUntil)}</strong></> : null}.
          Tout le contenu de Passerelle vous est maintenant ouvert : bonne préparation !
        </>
      ),
    },
    pending: {
      badge: <StatusBadge icon={Clock} tone="amber" />,
      title: "Merci, votre paiement est en cours de validation",
      text: "Votre banque n'a pas encore confirmé le paiement. Votre accès Premium s'ouvrira automatiquement dès sa confirmation, sans autre démarche de votre part.",
    },
    delayed: {
      badge: <StatusBadge icon={Clock} tone="amber" />,
      title: "Paiement reçu, merci !",
      text: "L'activation de votre accès prend un peu plus de temps que prévu. Rafraîchissez la page dans un instant : votre pass apparaîtra.",
    },
    none: {
      badge: <StatusBadge icon={Sparkles} tone="blue" />,
      title: "Aucun achat récent",
      text: "Cette page s'affiche après un paiement. Pour débloquer tout le contenu, choisissez un pass.",
    },
  }[state];

  return (
    <PageShell eyebrow="Paiement" title="Merci pour votre confiance" center>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-8 md:p-10 text-center">
          <div role="status" aria-live="polite">
            {head.badge}
            <h2 className={`mt-5 font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{head.title}</h2>
            <p className={`mt-3 text-[15px] leading-relaxed max-w-xl mx-auto ${c.sub}`}>{head.text}</p>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            {state === "active" && <Btn variant="accent" onClick={() => nav("mocks")}>Commencer un TCF blanc</Btn>}
            {state === "active" && <Btn variant="ghost" onClick={() => nav("dashboard")}>Mon tableau de bord</Btn>}
            {(state === "pending" || state === "activating") && <Btn variant="ghost" onClick={() => nav("dashboard")}>Aller au tableau de bord</Btn>}
            {state === "delayed" && <Btn icon={RotateCcw} onClick={() => window.location.reload()}>Rafraîchir la page</Btn>}
            {state === "dz" && dz?.waUrl && (
              <a href={dz.waUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-white shadow-lg" style={{ background: "#25D366" }}>
                <MessageCircle size={18} /> Envoyer aussi le reçu sur WhatsApp
              </a>
            )}
            {state === "dz" && <Btn variant="ghost" onClick={() => nav("dashboard")}>Aller au tableau de bord</Btn>}
            {state === "none" && <Btn onClick={() => nav("pricing")}>Voir les tarifs</Btn>}
          </div>
        </Card>

        {state === "active" && (
          <div>
            <h3 className={`font-display font-bold mb-3 ${c.text}`}>Par où commencer ?</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {NEXT_STEPS.map((s) => (
                <button key={s.route} onClick={() => nav(s.route)} className="text-left">
                  <Card className={`p-5 h-full transition-colors ${c.hoverSoft}`}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600/10 text-blue-600"><s.icon size={18} /></span>
                    <p className={`mt-3 font-display font-bold text-sm ${c.text}`}>{s.title}</p>
                    <p className={`mt-1 text-sm ${c.sub}`}>{s.text}</p>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )}

        {state !== "none" && (
          <p className={`text-center text-sm ${c.faint}`}>
            Une question sur votre paiement ?{" "}
            <button onClick={() => nav("contact")} className="font-semibold text-blue-600 hover:underline">Contactez-nous</button>
          </p>
        )}
      </div>
    </PageShell>
  );
}
