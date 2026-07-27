import { useCallback, useEffect, useState } from "react";
import { loadArchive } from "@/services/sujetsArchiveService";

// Loads a section's subjects archive (shipped base + admin overrides merged)
// for the public pages and the admin manager. `state.section` records which
// section the loaded `years` belong to: right after the admin flips EE↔EO the
// requested `section` changes a render before the effect refetches, so we report
// "loading" (and no data) until the loaded data matches the request — otherwise
// the EO editor would render against EE data (which has no `parties`) and crash.
export function useSujetsArchive(section) {
  const [state, setState] = useState({ loading: true, years: [], section: null });
  const reload = useCallback(() => {
    let alive = true;
    loadArchive(section).then((r) => { if (alive) setState({ loading: false, years: r.years, section }); });
    return () => { alive = false; };
  }, [section]);
  useEffect(() => { setState((s) => ({ ...s, loading: true })); return reload(); }, [reload]);
  const ready = state.section === section && !state.loading;
  return { loading: !ready, years: ready ? state.years : [], reload };
}
