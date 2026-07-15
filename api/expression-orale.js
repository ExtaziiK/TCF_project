import { requirePremium } from "./_lib/auth.js";
import { groqChatJSON, groqTranscribe, normalizeFeedback, HttpError, CHAT_MODEL_NAME, TRANSCRIBE_MODEL_NAME } from "./_lib/groq.js";
import { synthesizeFrench, TTS_MODEL_NAME } from "./_lib/tts.js";
import { logAiUsage } from "./_lib/usage.js";

// Expression orale — AI evaluation of a candidate's spoken response.
// 1) Whisper (whisper-large-v3-turbo) transcribes the recording.
// 2) Groq chat (openai/gpt-oss-20b) evaluates the transcript.
// The client posts the audio as base64 JSON (no multipart parsing needed);
// short TCF speaking clips stay well under the request-size limit.
//
// Two modes share this function (one endpoint keeps us inside Vercel Hobby's
// 12-function cap, same reason api/admin is consolidated):
//   - default: one-shot transcript + evaluation (legacy flow)
//   - mode "dialogue": one turn of the interview simulation — transcribe the
//     candidate's answer, then either ask the next follow-up question or,
//     after MAX_FOLLOW_UPS follow-ups have been answered, grade the whole
//     conversation. The client keeps the dialogue state and sends it back as
//     `history`; the function stays stateless.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression orale (spoken expression) section from a TRANSCRIPT of the candidate's speech.
Assess: relevance to the task, task coverage, vocabulary range, grammar, and fluency/coherence. You only have the transcript, so DO NOT judge pronunciation or accent.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"]}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

/* ------------------------- dialogue (interview) mode ------------------------ */

export const MAX_FOLLOW_UPS = 3;

// The interview itself is always in French (it's a French exam); only the
// final feedback follows the user's UI language, like the one-shot mode.
export const followUpSystem = `Tu es un examinateur du TCF Canada qui fait passer l'épreuve d'Expression orale sous forme d'entretien.
On te donne la consigne de la tâche et le dialogue déjà échangé avec le candidat. Ses répliques sont des transcriptions automatiques (Whisper) : ignore les petites fautes de transcription et ne juge jamais la prononciation.
Réagis à sa dernière réponse en UNE courte phrase naturelle, puis pose UNE question de relance qui l'amène à développer (précisions, exemples, justification, point de vue opposé). Reste strictement dans le sujet de la tâche, adopte un registre oral avec vouvoiement, et ne dépasse pas 2 phrases au total. Ne répète pas une question déjà posée.
Réponds UNIQUEMENT avec un objet JSON minifié de cette forme : {"reply":"<ta réaction + ta question de relance, en français>"}`;

export const finalSystem = (lang) => `You are a certified TCF Canada examiner. You just conducted the Expression orale section as a short interview: the candidate answered the task prompt, then ${MAX_FOLLOW_UPS} follow-up questions. You are given the full dialogue; the candidate's lines are Whisper transcripts, so ignore minor transcription noise and DO NOT judge pronunciation or accent.
Evaluate ONLY the candidate's contributions: relevance to the task, how well they developed and defended their answers under the follow-up questions, vocabulary range, grammar, and fluency/coherence.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"]}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

// The client echoes the conversation back each turn; clamp it so a tampered
// payload can't smuggle an arbitrary prompt volume into the billable call.
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 2 + MAX_FOLLOW_UPS * 2)
    .map((m) => ({
      role: m?.role === "examiner" ? "examiner" : "candidate",
      text: String(m?.text || "").trim().slice(0, 2000),
    }))
    .filter((m) => m.text);
}

async function dialogueTurn(res, user, body) {
  const { audio = "", mime = "audio/webm", prompt = "", taskLabel = "", lang = "fr" } = body;
  if (!audio) throw new HttpError(400, "No audio was received.");
  const buffer = Buffer.from(audio, "base64");
  if (!buffer.length) throw new HttpError(400, "The audio was empty.");

  const transcribeStart = Date.now();
  const transcript = await groqTranscribe(buffer, {
    filename: `speech.${extForMime(mime)}`,
    mime,
    language: "fr",
  });
  logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "transcription", model: TRANSCRIBE_MODEL_NAME, audioBytes: buffer.length, durationMs: Date.now() - transcribeStart });

  // Same near-silence guard as the one-shot mode: let the client re-prompt
  // the user instead of feeding an empty answer to the examiner.
  if (!transcript || transcript.replace(/\s/g, "").length < 3) {
    return res.status(200).json({ transcript: transcript || "", empty: true });
  }

  const history = sanitizeHistory(body.history);
  const followUpsAsked = history.filter((m) => m.role === "examiner").length;
  const dialogue = [...history, { role: "candidate", text: transcript.slice(0, 4000) }]
    .map((m) => `${m.role === "examiner" ? "Examinateur" : "Candidat"} : ${m.text}`)
    .join("\n");
  const userMsg = [
    taskLabel && `Tâche : ${taskLabel}`,
    prompt && `Consigne donnée au candidat : ${prompt}`,
    `Dialogue :\n"""\n${dialogue}\n"""`,
  ]
    .filter(Boolean)
    .join("\n");

  // Voices an examiner line with ElevenLabs; null (no key / API failure)
  // degrades to a text-only turn, spoken client-side if a voice exists there.
  // Character count is metered as "tokens" — ElevenLabs bills per character.
  const voiceLine = async (line) => {
    const ttsStart = Date.now();
    const tts = await synthesizeFrench(line);
    if (!tts) return {};
    logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "tts", model: TTS_MODEL_NAME, usage: { total_tokens: line.length }, audioBytes: tts.bytes, durationMs: Date.now() - ttsStart });
    return { audio: tts.audio, audioMime: "audio/mpeg" };
  };

  const chatStart = Date.now();
  if (followUpsAsked < MAX_FOLLOW_UPS) {
    const { json: raw, usage } = await groqChatJSON([
      { role: "system", content: followUpSystem },
      { role: "user", content: userMsg },
    ]);
    logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - chatStart });
    const reply = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 600) : "";
    if (!reply) throw new HttpError(502, "The AI returned a response we couldn't parse.");
    return res.status(200).json({ transcript, reply, followUp: followUpsAsked + 1, done: false, ...(await voiceLine(reply)) });
  }

  const { json: raw, usage } = await groqChatJSON([
    { role: "system", content: finalSystem(lang) },
    { role: "user", content: userMsg },
  ]);
  logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - chatStart });
  // The closing line lives here (not client-side) so it comes out in the same
  // examiner voice as the follow-ups.
  const closing = "Merci, l'entretien est terminé. Voici mon évaluation.";
  return res.status(200).json({ transcript, feedback: normalizeFeedback(raw), closing, done: true, ...(await voiceLine(closing)) });
}

/* ------------------------------- shared bits ------------------------------- */

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

    if (req.body?.mode === "dialogue") return await dialogueTurn(res, user, req.body);

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
