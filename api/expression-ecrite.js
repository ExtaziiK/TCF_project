import { requirePremiumOrFreeMock, claimAiUse, releaseAiUse, freeAiTaskKey } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage, logAiFailure } from "./_lib/usage.js";
import { copiedShare, COPIED_HARD, COPIED_WARN } from "./_lib/copiedPrompt.js";
import { nonLatinLetterShare, NOT_LATIN_SCRIPT } from "./_lib/scriptCheck.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

const system = (lang) => `You are a certified TCF Canada examiner grading Expression écrite. Be encouraging, honest and concrete.

SCORE. The TCF scores this épreuve OUT OF 20, so give a score /20 — not a CEFR level. Rate four criteria /20, then set the overall score at the level the candidate SUSTAINS (not an average: one strong criterion does not lift weak language, one slip does not sink solid work).
1. Consigne — task carried out, right text type and register, and length if a word count was given.
The candidate's word count is GIVEN to you above. Use that number; do not count the words yourself and never contradict it. If it falls inside the target range, the length is correct — say nothing about it and apply no length penalty.
LENGTH BELONGS TO THIS CRITERION AND NO OTHER. A short text still shows whatever range and control its sentences show: mark cohérence, lexique and morphosyntaxe on the LANGUAGE alone, exactly as you would if the text were the right length. Never lower them because the text is short — that is punishing the same fault four times. Only if the text is under three quarters of the minimum does the OVERALL score cap at 9, and even then the criteria keep their true values. With no word count given, say nothing about length.
2. Cohérence — organisation and linking of ideas: real connectors rather than sentences juxtaposed with "et"/"mais".
3. Lexique — range, precision, repetition.
4. Morphosyntaxe — range and control of tenses, agreement, subordination.
Bands: 0-3 not a genuine attempt in French — wrong language, keyboard mashing, or otherwise unintelligible; nothing here to credit, and this band is BELOW the "under three quarters of the minimum" cap discussed above, not covered by it. 4-5 A2 isolated sentences, frequent basic errors. 6-9 B1 task broadly done, simple repetitive language, non-blocking errors. 10-13 B2 clear, varied, real subordination, occasional errors. 14-15 C1 fluent, precise, controlled. 16-20 C2 near-native.
Most candidates sit at 6-13. Do NOT inflate: 14 for a text repeating "bonne chose" misleads someone about to pay for a real exam. The "caps at 9" rule above is a CEILING for text that is short but otherwise readable French — it never means "give 9": text with nothing to credit still scores 0-3, however short or long it is.

REWRITES — the most useful part of your answer, when the text has anything to work with. Pick 4 to 6 passages of the candidate's OWN text and show each at a higher level.
- "before": copied WORD FOR WORD from their text, mistakes included. Never paraphrased, never invented, never the same passage twice.
- Choose what gains most: flat or repeated vocabulary, vague words ("chose", "faire", "il y a"), clumsy structure.
- "after": a genuine rewrite of that exact passage — same meaning, clearly higher level: precise vocabulary, better connector, cleaner structure. Fixing only spelling or accents is NOT enough. NEVER a placeholder, instruction to yourself, or bracketed note such as "(texte à fournir en français)" — if you cannot rewrite the passage for real, drop that pair instead of inventing one.
- "why": one short phrase, e.g. "vocabulaire plus précis".

IMPROVEMENTS. One or two FULL SENTENCES each, never a label: what is wrong, why it costs marks, what to reach for. Quote the offending words in « ». Name the criterion (lexique, cohérence, syntaxe, registre). Every point must be demonstrated by one of the rewrites above, each covering a different weakness.

Also rewrite their whole text one level higher ("corrected"): their ideas, plan and length, upgraded language. Invent nothing.
Your own French must be impeccable — "faut accorder" instead of "il faut accorder" destroys your authority to correct anyone.
Write feedback in ${lang === "en" ? "English" : "French"}; "corrected", "before" and "after" are ALWAYS French.
Respond with ONLY a minified JSON object:
{"score":<0-20 whole number>,"criteria":{"consigne":<0-20>,"coherence":<0-20>,"lexique":<0-20>,"morphosyntaxe":<0-20>},"summary":"<1-2 sentences>","strengths":["<2-3 short points>"],"improvements":["<2-3 taught points>"],"targetLevel":"<CEFR level the rewrite reaches>","rewrites":[{"before":"","after":"","why":""}],"corrected":"<the improved French text>"}
"strengths", "improvements" and "rewrites" must never be empty for a genuine attempt at the task. EXCEPTION — a 0-3 response (not real French, or empty of content): "strengths" and "rewrites" MUST be [] instead (there is nothing there to praise or to rewrite), "corrected" is "", and "improvements" has exactly one item saying the response must be a genuine attempt in French. Give no CEFR level for the candidate: the /20 is converted officially and a letter you choose would contradict it.`;

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
        targetLevel: "",
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
        targetLevel: "",
        notAnAnswer: true,
        aiLeft: claim?.left,
      });
    }

    const userMsg = [
      taskLabel && `Tâche : ${String(taskLabel).slice(0, 200)}`,
      prompt && `Consigne : ${String(prompt).slice(0, 1000)}`,
      targetWords && `Nombre de mots attendu : ${String(targetWords).slice(0, 20)}`,
      `Nombre de mots réellement écrits : ${wordCount}`,
      copied >= COPIED_WARN &&
        `ALERTE : ${Math.round(copied * 100)} % de cette réponse est repris mot pour mot de la consigne ci-dessus. Ce qui est recopié n'est pas de la production du candidat et ne peut lui valoir aucun point de lexique ni de morphosyntaxe.`,
      `Réponse du candidat :\n"""\n${text.slice(0, 4000)}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const startedAt = Date.now();
    // temperature 0: a grade must not move when the same text is submitted
    // again. Sampling noise that renames a level between two presses of the
    // same button destroys the candidate's trust in every grade we give.
    const { json: raw, usage, model: usedModel } = await groqChatJSON([
      { role: "system", content: system(lang) },
      { role: "user", content: userMsg },
    ], { temperature: 0 });
    logAiUsage({ userId: user.id, endpoint: "expression-ecrite", kind: "chat", model: usedModel || CHAT_MODEL_NAME, usage, durationMs: Date.now() - startedAt });

    // How many analyses are left on this tache: 2 for a free account, 3 per
    // 10-minute window for a paid one. Undefined only when the counters could
    // not be reached, and the workshop then shows nothing rather than a wrong
    // number.
    // `text` is passed so the rewrites can be checked against what the
    // candidate actually wrote — see normalizeFeedback.
    res.status(200).json({ ...normalizeFeedback(raw, text), aiLeft: claim?.left });
  } catch (err) {
    // Record the failure as well as the successes. A saturated day otherwise
    // reads as a quiet one in the admin, which is the opposite of the truth.
    // err.model is the model that actually refused (the end of the fallback
    // chain), not the first one tried — otherwise every 429 is blamed on the
    // primary. err.upstreamDetail is Groq's own sentence, and err.requestPayload
    // is the exact body that was sent (system prompt, calibration and the
    // candidate's own text included) — together a full recording of the
    // refused call, for the admin to diagnose without guessing.
    logAiFailure({
      userId: user?.id, endpoint: "expression-ecrite", kind: "chat",
      model: err.model || CHAT_MODEL_NAME,
      status: err.upstreamStatus || err.status,
      detail: err.upstreamDetail,
      request: err.requestPayload,
    });
    // Give the use back: the candidate should not lose one of two attempts to
    // an upstream failure. A refusal (429) never claimed, so nothing to undo.
    await releaseAiUse(claim);
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
