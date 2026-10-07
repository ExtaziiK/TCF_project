import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { MessageSquareQuote, HelpCircle } from "lucide-react";
import { PageShell, Card, StarRating, Btn } from "@/components/common";
import { openFaq } from "@/pages/FAQ";
import { listApprovedReviews } from "@/services/testimonialsService";
import { useRatingSummary } from "@/hooks/useRatingSummary";

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : "";

// Public page listing every approved review, newest first.
//
// Ratings arrive from the dialog shown after a candidate's first TCF blanc;
// older success stories carry no rating, so the stars are omitted for those
// rather than shown as zero — an empty five-star row reads as "rated badly".
export function Avis() {
  const { c, t, nav, user } = useApp();
  const [items, setItems] = useState(null); // null = loading
  // Shared with the landing page, and counted over EVERY approved review rather
  // than the page's own slice, so the two never print different overall scores.
  const rating = useRatingSummary();

  useEffect(() => {
    let live = true;
    listApprovedReviews().then((r) => { if (live) setItems(r.items); });
    return () => { live = false; };
  }, []);

  return (
    <PageShell
      back
      wide
      eyebrow={t("Avis")}
      title={t("Ce que disent les candidats")}
      sub={t("Les avis publiés ici sont laissés par des membres de la plateforme, puis validés par notre équipe.")}
    >
      {/* The hook returns null below the threshold where an average would
          mislead, so there is no rule to repeat here. */}
      {rating && (
        <Card className="p-6 mb-8 max-w-md mx-auto text-center">
          <p className={`font-display font-extrabold text-4xl ${c.text}`}>{rating.average.toLocaleString("fr-CA")}</p>
          <div className="mt-2 flex justify-center"><StarRating value={Math.round(rating.average)} size={20} /></div>
          <p className={`mt-2 text-sm ${c.sub}`}>{rating.count} {t("avis notés")}</p>
        </Card>
      )}

      {/* How to add one: the profile form (signed in) or an account first, and
          the FAQ answer that walks through it with a GIF. */}
      <Card className="p-5 mb-8 max-w-3xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><MessageSquareQuote size={20} /></span>
        <div className="flex-1 min-w-[14rem]">
          <p className={`font-display font-bold ${c.text}`}>{t("Vous aussi, partagez votre expérience")}</p>
          <p className={`text-sm ${c.sub}`}>{t("Une note et quelques phrases : votre avis aide les prochains candidats.")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn small variant="ghost" icon={HelpCircle} onClick={() => openFaq(nav, "laisser-un-avis")}>{t("Comment laisser un témoignage ?")}</Btn>
          <Btn small onClick={() => nav(user ? "profile" : "register")}>{t("Laisser mon avis")}</Btn>
        </div>
      </Card>

      {items === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center max-w-lg mx-auto">
          <p className={`font-display font-bold ${c.text}`}>{t("Aucun avis pour l'instant")}</p>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("Passez un TCF blanc et soyez le premier à donner le vôtre.")}</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((r) => (
            <Card key={r.id} className="p-6 h-full flex flex-col">
              {r.rating ? <StarRating value={r.rating} /> : null}
              <p className={`mt-3 text-sm leading-relaxed flex-1 ${c.sub}`}>« {r.body} »</p>
              <div className={`mt-4 pt-4 border-t ${c.border}`}>
                {/* Only the stand-in label is translated — a real name is a
                    name, in any language. */}
                <p className={`text-sm font-semibold ${c.text}`}>{r.anonymous ? t(r.name) : r.name}</p>
                <p className={`text-xs ${c.faint}`}>
                  {[r.origin, r.level, when(r.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
