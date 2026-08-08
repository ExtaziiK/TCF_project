import { requirePremiumOrFreeMock, claimAiUse, releaseAiUse, freeAiTaskKey } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError, CHAT_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage } from "./_lib/usage.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression écrite (written expression) section, then coaching the candidate to reach a higher level.
Assess the candidate's response against the task: relevance to the instructions, task coverage, vocabulary range, grammar and spelling, coherence and register.
Be encouraging but honest and concrete.
GRADE THE WAY A TCF RATER DOES. The TCF Canada scores Expression écrite OUT OF 20, not in CEFR letters, so give a score out of 20 — that is the scale of the official grid and of the candidate's score report.
Score each official criterion out of 20 first, then give the overall score. Do not average them blindly: the overall score sits at the level the candidate SUSTAINS, so one strong criterion does not lift a text whose language is weak throughout, and a single slip does not sink an otherwise solid one.
The criteria:
1. Respect de la consigne — is the task actually carried out, in the required text type and register? Judge LENGTH only if a word count was given above: a text at less than three quarters of the minimum cannot take an overall score above 9, however well written, because half the task is missing. If NO word count and no task were given, say nothing about length and score this criterion on task completion alone — never assume the text is too short.
2. Cohérence et cohésion — is it organised, are the ideas linked by real connectors rather than juxtaposed with "et" and "mais"?
3. Compétence lexicale — range and precision of the vocabulary, and whether it is repeated.
4. Compétence morphosyntaxique — range and control of structures: tenses, agreement, subordination.
What the overall score means, so you place it honestly:
- 4-5 (A2): simple isolated sentences, frequent basic errors, very limited vocabulary.
- 6-9 (B1): the task is broadly carried out; simple, repetitive language, errors that do not usually block understanding, mostly juxtaposed sentences.
- 10-13 (B2): clear and organised, varied vocabulary, real connectors and subordination, errors that remain occasional.
- 14-15 (C1): fluent and nuanced, precise vocabulary, controlled structures, rare errors.
- 16-20 (C2): near-native precision, ease and range.
Most real candidates sit between 6 and 13. Do NOT be generous: awarding 14 to a text that repeats "bonne chose" and links everything with "aussi" misleads someone who is about to pay for a real exam.
Then rewrite the candidate's OWN text into an improved, higher-level version: keep their ideas, plan and intent — do NOT invent new arguments or pad it beyond the task's expected length — but upgrade the language (richer and more precise vocabulary, better connectors and sentence structure, correct grammar, spelling and register) so it would score higher. Aim for at least one CEFR level above their current level (up to C1/C2 when their ideas allow), while staying realistic and faithful to what they meant to say.
Most importantly, pick 4 to 6 specific passages OF THE CANDIDATE'S OWN TEXT and show a better version of each, so they see exactly which of their sentences to change and how.
Rules for these passages, which matter more than anything else in your answer:
- "before" MUST be copied WORD FOR WORD from the candidate's text, exactly as they wrote it, including their mistakes. Never paraphrase it, never correct it, never invent a sentence they did not write. Copy a whole sentence, or a complete clause.
- Never repeat a passage: each of the 4 to 6 must quote a DIFFERENT sentence of theirs.
- Choose the passages that gain the MOST from being rewritten — flat or repetitive vocabulary, vague words ("chose", "faire", "il y a", "très bien"), clumsy structure, sentences strung together with "et" or "mais".
- "after" must say the SAME thing at a clearly higher level: precise and varied vocabulary, a better connector, a cleaner structure. Fixing only spelling or accents is NOT enough — the vocabulary or the construction has to improve.
- "why" is one short phrase naming what improved, e.g. "vocabulaire plus précis", "connecteur logique", "structure allégée".
- Every point you list under "improvements" MUST be demonstrated by at least one of these passages. Advice with no example from their own text is the least useful thing you can give them: if you write that they repeat themselves, show the repeated sentence rewritten; if you write that their connectors are weak, show one being replaced. Cover a different weakness with each passage rather than fixing the same one repeatedly.
- Each "improvements" point must itself quote the offending word or phrase from their text, in « », instead of describing the problem in the abstract.
- Write each "improvements" point as one or two FULL SENTENCES that actually teach, never as a label. "vocabulaire plus précis" tells the candidate nothing they did not already suspect. Say WHAT is wrong with the words they chose, WHY it holds their mark down at this level, and WHAT to reach for instead. For example, rather than « problèmes » → vocabulaire plus précis, write: « problèmes » est un mot passe-partout qui n'indique pas de quoi il s'agit ; un examinateur attend un terme qui nomme la difficulté (inconvénients, risques, dérives). C'est précisément ce qui sépare un B1 d'un B2 sur le critère lexical.
- Name the TCF criterion each point concerns — lexique, cohérence, syntaxe, registre — so the candidate knows what is being marked.
- Your own French must be impeccable: complete sentences, nothing clipped. You are correcting a language exam, and "faut accorder" instead of "il faut accorder" in your feedback destroys your authority to correct anyone.
Write ALL feedback in ${lang === "en" ? "English" : "French"}. The rewritten text ("corrected") must ALWAYS be in French (it's a French exam), whatever the feedback language.
Respond with ONLY a minified JSON object of this exact shape:
{"score":<overall score out of 20, a whole number>,"criteria":{"consigne":<0-20>,"coherence":<0-20>,"lexique":<0-20>,"morphosyntaxe":<0-20>},"summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"],"targetLevel":"<the higher CEFR level the rewritten version reaches>","rewrites":[{"before":"<the candidate's own sentence, copied exactly>","after":"<the same idea, expressed at a higher level>","why":"<short reason>"}],"corrected":"<the improved, higher-level French rewrite of the candidate's text>"}
"strengths", "improvements" and "rewrites" must never be empty. "targetLevel" is the CEFR level the rewritten version reaches, one above the candidate's own. Do NOT output a CEFR level for the candidate: the score out of 20 is converted officially, and a letter you choose yourself would contradict it.
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
    // Give the use back: the candidate should not lose one of two attempts to
    // an upstream failure. A refusal (429) never claimed, so nothing to undo.
    await releaseAiUse(claim);
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
