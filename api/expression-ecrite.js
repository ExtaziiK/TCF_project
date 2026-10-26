import { requirePremiumOrFreeMock, claimAiUse, releaseAiUse, freeAiTaskKey } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage } from "./_lib/usage.js";
import { recordFailure, handleClientError } from "./_lib/failureContext.js";
import { copiedShare, COPIED_HARD, COPIED_WARN } from "./_lib/copiedPrompt.js";
import { nonLatinLetterShare, NOT_LATIN_SCRIPT } from "./_lib/scriptCheck.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
import { EE_TASK_BRIEFS, applyLengthRule, applyCriteriaCaps } from "./_lib/eeSpec.js";
import { eeSystem, eeUserMessage } from "./_lib/eeGrader.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

// The grading prompt and the per-tâche requirements live in api/_lib/eeGrader.js
// and api/_lib/eeSpec.js, shared with the model-answer generator, which runs
// every corrigé through this same grader before publishing it.

export default async function handler(req, res) {
  let claim = null;
  let user = null;
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    // A failure the browser saw and the server did not (see failureContext.js).
    if (req.body?.action === "client-error") return await handleClientError(req, res, "ee");
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

    // Counted HERE and handed over, never left to the model. Asked to judge
    // length itself it miscounts, and then justifies a penalty with a false
    // claim: a 160-word text inside a 120-180 target was capped at 9/20 for
    // "ne respecte pas le nombre de mots requis". Counted server-side rather
    // than taken from the client, so it cannot be spoofed to dodge the cap.
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Wrong script entirely — not French in any sense the grader can assess
    // (a wrong keyboard/input language is the usual real-world cause). Caught
    // here, deterministically: see scriptCheck.js for why leaving this to the
    // model produced a 9/20 "B1" for a paragraph its own summary called
    // incomprehensible. No Groq call spent, and the attempt is given back.
    if (nonLatinLetterShare(text) >= NOT_LATIN_SCRIPT) {
      await releaseAiUse(claim);
      return res.status(200).json({
        score: 0,
        level: "",
        nclc: null,
        criteria: {},
        summary: "Cette réponse n'est pas rédigée en français : elle ne peut pas être évaluée.",
        strengths: [],
        improvements: [
          "Vérifiez la langue de saisie de votre clavier, puis rédigez votre réponse en français dans la zone de texte.",
          `La tâche demande ${targetWords || "un texte"} : exposez votre réponse en français, avec vos propres mots.`,
        ],
        rewrites: [],
        corrected: "",
        notAnAnswer: true,
        aiLeft: claim?.left,
      });
    }

    // The consigne submitted back as an answer. Answered here rather than by
    // the grader: it noticed on one run and missed it on the next, and grading
    // copied documents as the candidate's own prose awards a level for text
    // they did not write.
    const copied = copiedShare(text, prompt);
    if (copied >= COPIED_HARD) {
      // No Groq call, so nothing to meter — and the attempt is given back,
      // since spending one of two analyses on a paste is a harsh way to learn
      // where the answer box is.
      await releaseAiUse(claim);
      return res.status(200).json({
        score: 0,
        level: "",
        nclc: null,
        criteria: {},
        summary: "Ce texte reprend la consigne : il n'y a pas de production personnelle à évaluer. Rédigez votre propre réponse dans la zone de saisie, puis relancez l'analyse.",
        strengths: [],
        improvements: [
          "Le texte envoyé est le sujet lui-même, pas votre réponse. Vérifiez que la zone de saisie contient bien ce que VOUS avez rédigé avant de lancer l'analyse.",
          `La tâche demande ${targetWords || "un texte"} : exposez votre opinion avec vos propres arguments et vos propres exemples.`,
        ],
        rewrites: [],
        corrected: "",
        notAnAnswer: true,
        aiLeft: claim?.left,
      });
    }

    const userMsg = eeUserMessage({ taskLabel, prompt, targetWords, wordCount, copied, text, warnAt: COPIED_WARN });

    const startedAt = Date.now();
    // temperature 0: a grade must not move when the same text is submitted
    // again. Sampling noise that renames a level between two presses of the
    // same button destroys the candidate's trust in every grade we give.
    // 120b at medium reasoning: tested live on the same off-topic-example text,
    // 20b at low effort scored it 13, 8 and 15 and never flagged the example;
    // 120b at medium caught it every time (9, 11) and kept a strong text at 15.
    // Reasoning tokens count against max_tokens on gpt-oss, hence the raise:
    // at 2000 the JSON came back empty. 20b still serves when 120b is spent.
    const { json: raw, usage, model: usedModel } = await groqChatJSON([
      { role: "system", content: eeSystem(lang, req.body?.task) },
      { role: "user", content: userMsg },
    ], { temperature: 0, startWith: "openai/gpt-oss-120b", reasoningEffort: "medium", maxTokens: 6000 });
    logAiUsage({ userId: user.id, endpoint: "expression-ecrite", kind: "chat", model: usedModel || CHAT_MODEL_NAME, usage, durationMs: Date.now() - startedAt });

    // How many analyses are left on this tache: 2 for a free account, 3 per
    // 10-minute window for a paid one. Undefined only when the counters could
    // not be reached, and the workshop then shows nothing rather than a wrong
    // number.
    // `text` is passed so the rewrites can be checked against what the
    // candidate actually wrote — see normalizeFeedback.
    // The official word-count rule, applied whatever the model wrote.
    res.status(200).json({ ...applyLengthRule(applyCriteriaCaps(normalizeFeedback(raw, text), raw), targetWords, wordCount), aiLeft: claim?.left });
  } catch (err) {
    // Record the failure as well as the successes — but ONLY when the request
    // actually reached Groq. ai_usage_log exists to meter GROQ calls, and the
    // admin's "Appels refusés" panel categorizes every row as a Groq problem
    // (quota, bad key, upstream error). requirePremiumOrFreeMock,
    // enforceRateLimit and claimAiUse above all throw their OWN 401/403/429
    // before Groq is ever called — an expired session, this endpoint's own
    // 10-calls/5min pacing, a free account's 2 analyses for the tâche already
    // spent. None of those are Groq refusing anything, and logging them here
    // mislabels them as "Quota Groq épuisé": a candidate hitting their own
    // free-tier cap once showed up in the admin as three straight Groq
    // refusals, with gpt-oss-120b sitting at 0% used — nothing to fall back
    // to, because nothing had asked Groq anything.
    // upstreamStatus is set ONLY by groq.js, and only once a Groq HTTP
    // response actually came back (see groqChatJSON/groqTranscribe) — its
    // presence is exactly the signal for "this really is a Groq refusal".
    // err.model is the model that actually refused (the end of the fallback
    // chain), not the first one tried — otherwise every 429 is blamed on the
    // primary. err.upstreamDetail is Groq's own sentence, and err.requestPayload
    // is the exact body that was sent (system prompt, calibration and the
    // candidate's own text included) — together a full recording of the
    // refused call, for the admin to diagnose without guessing.
    // Our OWN failures (5xx, exceptions) are recorded too, as incidents kept
    // apart from Groq's figures — see recordFailure.
    const words = String(req.body?.response || "").trim().split(/\s+/).filter(Boolean).length;
    await recordFailure(req, user, err, {
      section: "ee", endpoint: "expression-ecrite", kind: "chat",
      model: err.model || CHAT_MODEL_NAME, claim, extra: { words },
    });
    // Give the use back: the candidate should not lose one of two attempts to
    // an upstream failure. A refusal (429) never claimed, so nothing to undo.
    await releaseAiUse(claim);
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}

// The grader prompt and briefs, for tests and live checks of the grading.
export { eeSystem, EE_TASK_BRIEFS };
