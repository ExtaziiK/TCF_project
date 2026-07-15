import { requirePremium } from "./_lib/auth.js";
import { groqChatJSON, groqTranscribe, normalizeFeedback, HttpError, CHAT_MODEL_NAME, TRANSCRIBE_MODEL_NAME } from "./_lib/groq.js";
import { logAiUsage } from "./_lib/usage.js";

// Expression orale — AI evaluation of a candidate's spoken response.
// 1) Whisper (whisper-large-v3-turbo) transcribes the recording.
// 2) Groq chat (openai/gpt-oss-20b) evaluates the transcript.
// The client posts the audio as base64 JSON (no multipart parsing needed);
// short TCF speaking clips stay well under the request-size limit.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression orale (spoken expression) section from a TRANSCRIPT of the candidate's speech.
Assess: relevance to the task, task coverage, vocabulary range, grammar, and fluency/coherence. You only have the transcript, so DO NOT judge pronunciation or accent.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"]}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

// Whisper accepts several containers; map the browser MIME to a matching
// extension so the multipart filename doesn't mislead the decoder.
function extForMime(mime = "") {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await requirePremium(req);

    const { audio = "", mime = "audio/webm", prompt = "", taskLabel = "", lang = "fr" } = req.body || {};
    if (!audio) throw new HttpError(400, "No audio was received.");

    const buffer = Buffer.from(audio, "base64");
    if (!buffer.length) throw new HttpError(400, "The audio was empty.");

    const transcribeStart = Date.now();
    const transcript = await groqTranscribe(buffer, {
      filename: `speech.${extForMime(mime)}`,
      mime,
      language: lang === "en" ? "en" : "fr",
    });
    logAiUsage({ userId: user.id, endpoint: "expression-orale", kind: "transcription", model: TRANSCRIBE_MODEL_NAME, audioBytes: buffer.length, durationMs: Date.now() - transcribeStart });

    // Whisper hallucinates captions on near-silence; treat very short output
    // as "nothing said" and skip the (pointless) evaluation call.
    if (!transcript || transcript.replace(/\s/g, "").length < 3) {
      return res.status(200).json({ transcript: transcript || "", empty: true, level: "", summary: "", strengths: [], improvements: [] });
    }

    const userMsg = [
      taskLabel && `Tâche : ${taskLabel}`,
      prompt && `Consigne : ${prompt}`,
      `Transcription de la réponse orale :\n"""\n${transcript.slice(0, 4000)}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const chatStart = Date.now();
    const { json: raw, usage } = await groqChatJSON([
      { role: "system", content: system(lang) },
      { role: "user", content: userMsg },
    ]);
    logAiUsage({ userId: user.id, endpoint: "expression-orale", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - chatStart });

    res.status(200).json({ transcript, ...normalizeFeedback(raw) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "AI evaluation failed." });
  }
}
