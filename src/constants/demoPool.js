// Which Compréhension écrite quiz-1 questions the landing demo draws from
// (components/home/DemoQuestionCE.jsx). Plain JS with no "@" imports: the
// bank Vite plugin (scripts/bankManifestPlugin.mjs) and the media script
// (scripts/fetch-demo-media.mjs) read it from Node too.
//
// The bank carries no per-question CEFR tag, but the official TCF orders items
// by increasing difficulty across the 39-question épreuve (A1→C2), so the
// early-middle stretch is A2 then B1 — past the A1 openers, short of the
// B2/C1/C2 closers. Question orders, 1-based.
export const CE_DEMO_QUIZ = 1;
export const CE_DEMO_A2 = [6, 7, 8, 9, 10, 11, 12, 13];
export const CE_DEMO_B1 = [14, 15, 16, 17, 18, 19, 20, 21, 22];
export const CE_DEMO_ORDERS = [...CE_DEMO_A2, ...CE_DEMO_B1];

// The landing CO demo (components/home/DemoQuestion.jsx): the B2 stretch of
// Compréhension orale quiz 1 — past the A1/A2/B1 openers, short of the C1/C2
// closers, and the items with full text options (the first eight are
// image/audio-only).
export const CO_DEMO_QUIZ = 1;
export const CO_DEMO_ORDERS = [21, 22, 23, 24, 25, 26, 27, 28, 29];
