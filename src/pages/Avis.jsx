import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, StarRating } from "@/components/common";
import { listApprovedReviews } from "@/services/testimonialsService";

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) : "";

// Public page listing every approved review, newest first.
//
// Ratings arrive from the dialog shown after a candidate's first TCF blanc;
// older success stories carry no rating, so the stars are omitted for those
// rather than shown as zero — an empty five-star row reads as "rated badly".
export function Avis() {
  const { c, t } = useApp();
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    let live = true;
    listApprovedReviews().then((r) => { if (live) setItems(r.items); });
    return () => { live = false; };
  }, []);

  const rated = (items || []).filter((r) => r.rating);
  const average = rated.length
    ? Math.round((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10) / 10
    : 0;

  return (
    <PageShell
      back
      wide
      eyebrow={t("Avis")}
      title={t("Ce que disent les candidats")}
      sub={t("Les avis publiés ici sont laissés par des membres après leur TCF blanc, puis validés par notre équipe.")}
    >
      {/* Averages only once there are enough ratings to mean anything. Three is
          the point below which one opinion moves the number by a whole star. */}
      {rated.length >= 3 && (
        <Card className="p-6 mb-8 max-w-md mx-auto text-center">
          <p className={`font-display font-extrabold text-4xl ${c.text}`}>{average.toLocaleString("fr-CA")}</p>
          <div className="mt-2 flex justify-center"><StarRating value={Math.round(average)} size={20} /></div>
          <p className={`mt-2 text-sm ${c.sub}`}>{rated.length} {t("avis notés")}</p>
        </Card>
      )}

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
                <p className={`text-sm font-semibold ${c.text}`}>{r.name}</p>
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
