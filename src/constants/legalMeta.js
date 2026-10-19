// The small, always-needed facts about the legal documents, kept apart from
// their text (constants/terms.js, constants/privacy.js): the signup flow, the
// terms gate and the SEO table read these on every page, and should not pull
// several pages of conditions into the first JavaScript file to do it.

// Bumped whenever the wording changes: every acceptance is recorded against
// this string (terms_acceptances, 20260730 migration), which is what lets you
// tell later who agreed to which text. Keep each published version in git.
export const TERMS_VERSION = "1.1";
export const TERMS_UPDATED = "9 août 2026";

// Flips the "still being written" notice on the page and in the dialog, and
// the noindex on both legal pages. False since the documents went into force;
// set it back to true only if a future rewrite is published as a draft again.
export const TERMS_DRAFT = false;

// Whether signed-in accounts are stopped and asked to accept again when
// TERMS_VERSION moves past what they agreed to (TermsGate, a full-page block).
//
// OFF by choice: the requirement is only that the conditions are readable at
// the moment someone signs up — the consent box opens them on click — not that
// existing accounts are interrupted. Consent is therefore recorded for new
// signups only; accounts created before it are not asked again.
//
// Deliberately a constant rather than `!TERMS_DRAFT`: derived from the draft
// flag, the gate switched itself on the moment the documents went into force,
// which is not something a publication step should do behind your back. Set it
// to true only if you decide you want that wave.
export const TERMS_REACCEPTANCE = false;

// The privacy policy publishes together with the conditions.
export const PRIVACY_DRAFT = TERMS_DRAFT;
