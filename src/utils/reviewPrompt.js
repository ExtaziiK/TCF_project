// Whether the post-exam review dialog may open again.
//
// "Plus tard" is an answer, not a dismissal: someone who has just spent two
// hours on a TCF blanc and wants to see their score first is not saying no. So
// it now costs them nothing — the dialog comes back after their next exam,
// where the same question is worth asking again.
//
// The ✕ and Escape still mean no, and they mean it permanently. Keeping the two
// apart is the whole point: a "later" that never returns is a lie, and a "no"
// that keeps coming back is the thing that makes people resent being asked.
//
// Capped all the same, because "later" honoured forever is just nagging with
// extra steps. After MAX_ASKS the dialog stops offering itself; the profile
// page remains the way in for anyone who does want to write one.
//
// localStorage rather than a table: there is nothing to write server-side yet —
// the member has not left a review — and a row recording "asked, said not yet"
// is not worth the round trip. Losing it to a cleared cache costs one extra ask.
const KEY = "passerelle.reviewAsks";
export const MAX_ASKS = 3;

const read = () => {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; } // private mode: they get asked again, which is the safe direction
};

const write = (n) => {
  try { localStorage.setItem(KEY, String(n)); } catch { /* private mode: the deferral just won't persist */ }
};

// Has this candidate put the question off before? Together with `firstEver` in
// the exam runner, this is what re-opens the dialog on a later attempt.
export const reviewAskDeferred = () => read() > 0;

// False once they have been asked enough times, whether they deferred each time
// or closed it outright.
export const mayAskForReview = () => read() < MAX_ASKS;

// "Plus tard" — spend one of the asks, keep the rest.
export const deferReviewAsk = () => write(read() + 1);

// ✕ or Escape — spend them all.
export const endReviewAsks = () => write(MAX_ASKS);
