import { useCallback, useEffect, useRef, useState } from "react";
import { loadArchive } from "@/services/sujetsArchiveService";

// Loads a section's subjects archive (shipped base + admin overrides merged)
// for the public pages and the admin manager. `state.section` records which
// section the loaded `years` belong to: right after the admin flips EE↔EO the
// requested `section` changes a render before the effect refetches, so we report
// "loading" (and no data) until the loaded data matches the request — otherwise
// the EO editor would render against EE data (which has no `parties`) and crash.
//
// `reload` is awaitable: the admin manager writes a month, then waits for the
// refetch before re-enabling its buttons, so the next write is built on the
// month that came back rather than on the copy captured before the save.
export function useSujetsArchive(section) {
  const [state, setState] = useState({ loading: true, years: [], section: null });
  // Only the newest request may publish its result — a slow EE fetch must not
  // land on top of the EO data the admin has since switched to.
  const reqId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const reload = useCallback(async () => {
    const id = ++reqId.current;
    const r = await loadArchive(section);
    if (!mounted.current || id !== reqId.current) return null;
    setState({ loading: false, years: r.years, section });
    return r.years;
  }, [section]);

  useEffect(() => { setState((s) => ({ ...s, loading: true })); reload(); }, [reload]);
  const ready = state.section === section && !state.loading;
  return { loading: !ready, years: ready ? state.years : [], reload };
}
