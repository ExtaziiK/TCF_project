import { useCallback, useEffect, useState } from "react";
import { loadArchive } from "@/services/sujetsArchiveService";

// Loads a section's subjects archive (DB, with shipped-JSON fallback) for the
// public pages and the admin manager. `source` is "db" or "shipped".
export function useSujetsArchive(section) {
  const [state, setState] = useState({ loading: true, years: [], source: null });
  const reload = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    loadArchive(section).then((r) => { if (alive) setState({ loading: false, years: r.years, source: r.source }); });
    return () => { alive = false; };
  }, [section]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}
