import { useEffect, useState } from "react";
import { TESTIMONIALS } from "@/constants/home";
import { listApprovedTestimonials } from "@/services/testimonialsService";
import { getHomeTestimonials } from "@/services/settingsService";

// The three seed stories, in the shape the table returns, so the landing page
// renders identically before the migration is applied (or if the read fails).
const SEED = TESTIMONIALS.map((tm, i) => ({ id: `seed-${i}`, name: tm.name, origin: tm.from, level: tm.level, body: tm.text }));

// Approved success stories for the landing page, plus whether the section is
// shown at all (Admin › Accueil › Témoignages).
//
// Returns null until BOTH reads land. That is the point of the null: a section
// an admin has switched off must never paint first and disappear a moment
// later, which is what rendering the seed copy immediately would do.
//
// Once loaded, `items` falls back to the seed stories when the table is empty
// or unreachable — an approved-but-empty grid would leave a bare heading on the
// page. Hiding the section is the admin's decision, not an accident of content.
export function useTestimonials(limit = 6) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cfg, list] = await Promise.all([getHomeTestimonials(), listApprovedTestimonials(limit)]);
      if (cancelled) return;
      setState({ enabled: cfg.enabled, items: list.ok && list.items.length ? list.items : SEED });
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return state;
}
