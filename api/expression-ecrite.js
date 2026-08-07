import { requirePremiumOrFreeMock, claimAiUse, releaseAiUse, freeAiTaskKey } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage } from "./_lib/usage.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression écrite (written expression) section, then coaching the candidate to reach a higher level.
Assess the candidate's response against the task: relevance to the instructions, task coverage, vocabulary range, grammar and spelling, coherence and register.
Be encouraging but honest and concrete. Estimate the candidate's CURRENT CEFR level (A1, A2, B1, B2, C1 or C2).
Then rewrite the candidate's OWN text into an improved, higher-level version: keep their ideas, plan and intent — do NOT invent new arguments or pad it beyond the task's expected length — but upgrade the language (richer and more precise vocabulary, better connectors and sentence structure, correct grammar, spelling and register) so it would score higher. Aim for at least one CEFR level above their current level (up to C1/C2 when their ideas allow), while staying realistic and faithful to what they meant to say.
Most importantly, pick 4 to 6 specific passages OF THE CANDIDATE'S OWN TEXT and show a better version of each, so they see exactly which of their sentences to change and how.
Rules for these passages, which matter more than anything else in your answer:
- "before" MUST be copied WORD FOR WORD from the candidate's text, exactly as they wrote it, including their mistakes. Never paraphrase it, never correct it, never invent a sentence they did not write. Copy a whole sentence, or a complete clause.
- Choose the passages that gain the MOST from being rewritten — flat or repetitive vocabulary, vague words ("chose", "faire", "il y a", "très bien"), clumsy structure, sentences strung together with "et" or "mais".
- "after" must say the SAME thing at a clearly higher level: precise and varied vocabulary, a better connector, a cleaner structure. Fixing only spelling or accents is NOT enough — the vocabulary or the construction has to improve.
- "why" is one short phrase naming what improved, e.g. "vocabulaire plus précis", "connecteur logique", "structure allégée".
- Every point you list under "improvements" MUST be demonstrated by at least one of these passages. Advice with no example from their own text is the least useful thing you can give them: if you write that they repeat themselves, show the repeated sentence rewritten; if you write that their connectors are weak, show one being replaced. Cover a different weakness with each passage rather than fixing the same one repeatedly.
- Each "improvements" point must itself quote the offending word or phrase from their text, in « », instead of describing the problem in the abstract.
Write ALL feedback in ${lang === "en" ? "English" : "French"}. The rewritten text ("corrected") must ALWAYS be in French (it's a French exam), whatever the feedback language.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<candidate's current CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"],"targetLevel":"<the higher CEFR level the rewritten version reaches>","rewrites":[{"before":"<the candidate's own sentence, copied exactly>","after":"<the same idea, expressed at a higher level>","why":"<short reason>"}],"corrected":"<the improved, higher-level French rewrite of the candidate's text>"}
"strengths", "improvements" and "rewrites" must never be empty, and "targetLevel" must be higher than "level".
"before" and "after" are always in French, whatever the feedback language; only "why" follows it.`;

export default async function handler(req, res) {
  let claim = null;
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    // Premium, or a free account inside the one TCF blanc it is entitled to —
    // the attempt id is verified server-side (see requirePremiumOrFreeMock).
    const user = await requirePremiumOrFreeMock(req, req.body?.attemptId);
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
    const { json: raw, usage } = await groqChatJSON([
      { role: "system", content: system(lang) },
      { role: "user", content: userMsg },
    ]);
    logAiUsage({ userId: user.id, endpoint: "expression-ecrite", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - startedAt });

    // How many analyses are left on this tache: 2 for a free account, 3 per
    // 5-minute window for a paid one. Undefined only when the counters could
    // not be reached, and the workshop then shows nothing rather than a wrong
    // number.
    // `text` is passed so the rewrites can be checked against what the
    // candidate actually wrote — see normalizeFeedback.
    res.status(200).json({ ...normalizeFeedback(raw, text), aiLeft: claim?.left });
  } catch (err) {
    // Give the use back: the candidate should not lose one of two attempts to
    // an upstream failure. A refusal (429) never claimed, so nothing to undo.
    await releaseAiUse(claim);
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
