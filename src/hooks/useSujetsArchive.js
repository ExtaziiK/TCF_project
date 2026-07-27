import { useCallback, useEffect, useState } from "react";
import { loadArchive } from "@/services/sujetsArchiveService";

// Loads a section's subjects archive (shipped base + admin overrides merged)
// for the public pages and the admin manager.
export function useSujetsArchive(section) {
  const [state, setState] = useState({ loading: true, years: [] });
  const reload = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    loadArchive(section).then((r) => { if (alive) setState({ loading: false, years: r.years }); });
    return () => { alive = false; };
  }, [section]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}
