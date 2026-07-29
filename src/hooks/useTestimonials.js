import { useEffect, useState } from "react";
import { TESTIMONIALS } from "@/constants/home";
import { listApprovedTestimonials } from "@/services/testimonialsService";

// The three seed stories, in the shape the table returns, so the landing page
// renders identically before the migration is applied (or if the read fails).
const SEED = TESTIMONIALS.map((tm, i) => ({ id: `seed-${i}`, name: tm.name, origin: tm.from, level: tm.level, body: tm.text }));

// Approved success stories for the landing page. Starts from the seed copy so
// the section never flashes empty, then swaps in whatever the admin has
// approved. An empty table also keeps the seed copy — an approved-but-empty
// grid would leave a bare heading on the page.
export function useTestimonials(limit = 6) {
  const [items, setItems] = useState(SEED);
  useEffect(() => {
    let cancelled = false;
    listApprovedTestimonials(limit).then((r) => {
      if (!cancelled && r.ok && r.items.length) setItems(r.items);
    });
    return () => { cancelled = true; };
  }, [limit]);
  return items;
}
