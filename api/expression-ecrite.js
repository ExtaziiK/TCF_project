import { requireUser } from "./_lib/auth.js";
import { groqChatJSON, normalizeFeedback, HttpError } from "./_lib/groq.js";

// Expression écrite — AI evaluation of a candidate's written response.
// Text-to-text via Groq chat (openai/gpt-oss-20b). Returns structured
// feedback the workshop renders as-is.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression écrite (written expression) section.
Assess the candidate's response against the task: relevance to the instructions, task coverage, vocabulary range, grammar and spelling, coherence and register.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"],"corrected":"<an improved version of the candidate's text, same ideas, exam-appropriate French>"}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    await requireUser(req);

    const { prompt = "", response = "", taskLabel = "", targetWords = "", lang = "fr" } = req.body || {};
    const text = String(response).trim();
    if (!text) throw new HttpError(400, "The response is empty.");

    const userMsg = [
      taskLabel && `Tâche : ${taskLabel}`,
      prompt && `Consigne : ${prompt}`,
      targetWords && `Nombre de mots attendu : ${targetWords}`,
      `Réponse du candidat :\n"""\n${text.slice(0, 4000)}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await groqChatJSON([
      { role: "system", content: system(lang) },
      { role: "user", content: userMsg },
    ]);

    res.status(200).json(normalizeFeedback(raw));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
