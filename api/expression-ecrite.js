import { requirePremiumOrFreeMock, claimAiUse, releaseAiUse, freeAiTaskKey } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage, logAiFailure } from "./_lib/usage.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

const system = (lang) => `You are a certified TCF Canada examiner grading Expression écrite. Be encouraging, honest and concrete.

SCORE. The TCF scores this épreuve OUT OF 20, so give a score /20 — not a CEFR level. Rate four criteria /20, then set the overall score at the level the candidate SUSTAINS (not an average: one strong criterion does not lift weak language, one slip does not sink solid work).
1. Consigne — task carried out, right text type and register. Judge LENGTH only if a word count is given above: below three quarters of the minimum, the overall score cannot exceed 9. With no word count given, never assume the text is short.
2. Cohérence — organisation, real connectors rather than sentences juxtaposed with "et"/"mais".
3. Lexique — range, precision, repetition.
4. Morphosyntaxe — range and control of tenses, agreement, subordination.
Bands: 4-5 A2 isolated sentences, frequent basic errors. 6-9 B1 task broadly done, simple repetitive language, non-blocking errors. 10-13 B2 clear, varied, real subordination, occasional errors. 14-15 C1 fluent, precise, controlled. 16-20 C2 near-native.
Most candidates sit at 6-13. Do NOT inflate: 14 for a text repeating "bonne chose" misleads someone about to pay for a real exam.

REWRITES — the most useful part of your answer. Pick 4 to 6 passages of the candidate's OWN text and show each at a higher level.
- "before": copied WORD FOR WORD from their text, mistakes included. Never paraphrased, never invented, never the same passage twice.
- Choose what gains most: flat or repeated vocabulary, vague words ("chose", "faire", "il y a"), clumsy structure.
- "after": same meaning, clearly higher level — precise vocabulary, better connector, cleaner structure. Fixing only spelling or accents is NOT enough.
- "why": one short phrase, e.g. "vocabulaire plus précis".

IMPROVEMENTS. One or two FULL SENTENCES each, never a label: what is wrong, why it costs marks, what to reach for. Quote the offending words in « ». Name the criterion (lexique, cohérence, syntaxe, registre). Every point must be demonstrated by one of the rewrites above, each covering a different weakness.

Also rewrite their whole text one level higher ("corrected"): their ideas, plan and length, upgraded language. Invent nothing.
Your own French must be impeccable — "faut accorder" instead of "il faut accorder" destroys your authority to correct anyone.
Write feedback in ${lang === "en" ? "English" : "French"}; "corrected", "before" and "after" are ALWAYS French.
Respond with ONLY a minified JSON object:
{"score":<0-20 whole number>,"criteria":{"consigne":<0-20>,"coherence":<0-20>,"lexique":<0-20>,"morphosyntaxe":<0-20>},"summary":"<1-2 sentences>","strengths":["<2-3 short points>"],"improvements":["<2-3 taught points>"],"targetLevel":"<CEFR level the rewrite reaches>","rewrites":[{"before":"","after":"","why":""}],"corrected":"<the improved French text>"}
"strengths", "improvements" and "rewrites" must never be empty. Give no CEFR level for the candidate: the /20 is converted officially and a letter you choose would contradict it.`;

export default async function handler(req, res) {
  let claim = null;
  let user = null;
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    // Premium, or a free account inside the one TCF blanc it is entitled to —
    // the attempt id is verified server-side (see requirePremiumOrFreeMock).
    user = await requirePremiumOrFreeMock(req, req.body?.attemptId);
    // Each call is a billable Groq request; cap the pace per account so a
    // scripted client can't burn the AI budget (Premium gates access, not volume).
    await enforceRateLimit(req, { name: "expr-ecrite", limit: 10, windowSeconds: 300, userId: user.id });

    const { prompt = "", response = "", taskLabel = "", targetWords = "", lang = "fr" } = req.body || {};
    const text = String(response).trim();
    if (!text) throw new HttpError(400, "The response is empty.");

    // Free accounts get FREE_AI_USES_PER_TASK analyses per tache; Premium is
    // unlimited and claim returns null. Claimed before the Groq call so a burst
    // of clicks is refused rather than served, and released below if it fails.
    claim = await claimAiUse(user, req.body?.attemptId, freeAiTaskKey("ee", req.body?.task));

    const userMsg = [
      taskLabel && `Tâche : ${String(taskLabel).slice(0, 200)}`,
      prompt && `Consigne : ${String(prompt).slice(0, 1000)}`,
      targetWords && `Nombre de mots attendu : ${String(targetWords).slice(0, 20)}`,
      `Réponse du candidat :\n"""\n${text.slice(0, 4000)}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const startedAt = Date.now();
    // temperature 0: a grade must not move when the same text is submitted
    // again. Sampling noise that renames a level between two presses of the
    // same button destroys the candidate's trust in every grade we give.
    const { json: raw, usage } = await groqChatJSON([
      { role: "system", content: system(lang) },
      { role: "user", content: userMsg },
    ], { temperature: 0 });
    logAiUsage({ userId: user.id, endpoint: "expression-ecrite", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - startedAt });

    // How many analyses are left on this tache: 2 for a free account, 3 per
    // 5-minute window for a paid one. Undefined only when the counters could
    // not be reached, and the workshop then shows nothing rather than a wrong
    // number.
    // `text` is passed so the rewrites can be checked against what the
    // candidate actually wrote — see normalizeFeedback.
    res.status(200).json({ ...normalizeFeedback(raw, text), aiLeft: claim?.left });
  } catch (err) {
    // Record the failure as well as the successes. A saturated day otherwise
    // reads as a quiet one in the admin, which is the opposite of the truth.
    logAiFailure({ userId: user?.id, endpoint: "expression-ecrite", kind: "chat", model: CHAT_MODEL_NAME, status: err.upstreamStatus || err.status });
    // Give the use back: the candidate should not lose one of two attempts to
    // an upstream failure. A refusal (429) never claimed, so nothing to undo.
    await releaseAiUse(claim);
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
