import { CheckCircle2, Clock, Loader2, Timer, BookOpenCheck, LayoutDashboard, RotateCcw, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";

// Thank-you page — Stripe's success_url (/merci?session_id=…). AppProvider
// reads the session id on load, strips it from the URL, grants the pass and
// reports progress through `checkoutStatus`; this page only shows it.
//
// Opened without a payment behind it (a refresh, a bookmark), the status is
// null and the page falls back to the account itself: a Premium account gets
// its pass summary, anyone else a way to the pricing page.

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
  const state = checkoutStatus || (premium ? "active" : "none");

  const head = {
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
