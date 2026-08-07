import { useEffect, useState } from "react";
import { Clock, XCircle, Receipt } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { latestRequest } from "@/services/subscriptionService";

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

// Where a DZD buyer finds out where their payment stands.
//
// Before this, the only feedback was the confirmation screen shown once, right
// after submitting — reload the page and every trace was gone. Someone waiting
// could not confirm their request even existed, and someone whose receipt was
// REFUSED was told nothing at all: no message, no status, no reason. They
// waited, then wrote in.
//
// Deliberately silent on an approved request: the pass is already active by
// then (useDzActivation reminted the token), and the plan showing in the header
// says it better than a card would.
export function DzRequestStatus() {
  const { c, t, nav } = useApp();
  const [req, setReq] = useState(null);

  useEffect(() => {
    let live = true;
    latestRequest().then((r) => { if (live) setReq(r); });
    return () => { live = false; };
  }, []);

  if (!req || req.status === "approved") return null;

  const refused = req.status === "rejected";

  return (
    <Card className={`p-5 mb-6 border-2 ${refused ? "border-rose-500/40" : "border-amber-500/40"}`}>
      <div className="flex items-start gap-4">
        <span className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${refused ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-600"}`}>
          {refused ? <XCircle size={20} /> : <Clock size={20} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${c.text}`}>
            {refused ? t("Votre paiement n'a pas été validé") : t("Paiement en cours de vérification")}
          </p>
          <p className={`mt-1 text-sm ${c.sub}`}>
            {t("Forfait")} <strong className={c.text}>{t(req.plan)}</strong>
            {req.amount_dzd ? ` · ${req.amount_dzd}` : ""} · {t("demande envoyée le")} {when(req.created_at)}.
          </p>

          {/* The reason is the whole point of showing a refusal: without it the
              buyer knows something failed but not what to change. */}
          {refused && req.review_note && (
            <p className={`mt-2 text-sm ${c.text}`}>« {req.review_note} »</p>
          )}

          <p className={`mt-2 text-sm ${c.sub}`}>
            {refused
              ? t("Vous pouvez renvoyer un reçu : l'accès est activé dès qu'il est vérifié.")
              : t("Votre accès est activé dès que nous avons vérifié votre reçu, sans action de votre part.")}
          </p>

          {refused && (
            <Btn small variant="accent" icon={Receipt} className="mt-4" onClick={() => nav("checkout-dz")}>
              {t("Renvoyer un reçu")}
            </Btn>
          )}
        </div>
      </div>
    </Card>
  );
}
