// The TCF blanc a free account is currently sitting.
//
// A "Sans papier" user is entitled to one mock exam WITH the AI correction, and
// the server proves that entitlement from the attempt itself: the AI endpoints
// accept a non-Premium caller only when the attempt named in the request is
// theirs, is flagged as the free mock, and is still in progress
// (requirePremiumOrFreeMock in api/_lib/auth.js).
//
// Which means the id has to reach aiService — three hooks and several
// components below the exam runner. Passing it as a prop through all of them
// would thread an id that only one tier ever uses through every workshop
// screen, so it is held here instead and read by aiService as a default. Same
// approach as utils/dzCheckout.js.
//
// Module state, not storage: it is only meaningful while the exam is on screen,
// and Mocks re-sets it on mount when a free attempt resumes after a reload.
let currentId = null;

// Called by the exam runner: the id while a free attempt is open, null on any
// other attempt so a Premium exam never sends one, and null when it ends.
export const setFreeMockAttemptId = (id) => { currentId = id || null; };

export const getFreeMockAttemptId = () => currentId;
