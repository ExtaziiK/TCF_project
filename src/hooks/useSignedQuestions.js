import { useEffect, useMemo, useState } from "react";
import { signQuizMedia } from "@/services/mediaService";

// Resolves signed-media descriptors for a static question list — the review /
// correction screens (QuizReport reopened from a stored attempt), where the
// Quiz engine that normally performs this exchange isn't mounted. Questions
// without a `sign` descriptor pass through untouched, so bundled dev media and
// public URLs keep working exactly as before; with the signed-media flag off
// this is a no-op.
//
// `questions` must be referentially stable across renders (a bank quiz's
// questions array is), or the batch would be re-signed on every render.
export function useSignedQuestions(questions) {
  const [signed, setSigned] = useState({});
  useEffect(() => {
    const descriptors = (questions || [])
      .map((q, idx) => (q.sign ? { idx, ...q.sign } : null))
      .filter(Boolean);
    if (descriptors.length === 0) { setSigned({}); return; }
    let cancelled = false;
    signQuizMedia(descriptors).then((map) => { if (!cancelled) setSigned(map); });
    return () => { cancelled = true; };
  }, [questions]);
  return useMemo(
    () => (questions || []).map((q, idx) =>
      q.sign ? { ...q, image: signed[idx]?.image ?? q.image ?? null, audio: signed[idx]?.audio ?? q.audio ?? null } : q
    ),
    [questions, signed]
  );
}
