import { requirePremiumOrFreeMock } from "./_lib/auth.js";
import { enforceRateLimit } from "./_lib/ratelimit.js";
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
//   - mode "dialogue": one turn of the Tâche 2 (Interaction) simulation —
//     transcribe the candidate's answer, then either reply in character as the
//     candidate's interlocutor (never as a helper) or grade the whole exchange.
//     The interview is TIME-BOXED like the real exam: the client runs down the
//     task's speaking budget and sends `final: true` on the turn where the time
//     runs out, which is what triggers grading (MAX_EXCHANGES is only a runaway
//     safety net). The client keeps the dialogue state and sends it back as
//     `history`; the function stays stateless.

const system = (lang) => `You are a certified TCF Canada examiner grading the Expression orale (spoken expression) section from a TRANSCRIPT of the candidate's speech.
Assess: relevance to the task, task coverage, vocabulary range, grammar, and fluency/coherence. You only have the transcript, so DO NOT judge pronunciation or accent.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"]}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

/* ------------------------- dialogue (interview) mode ------------------------ */

// The interview ends on TIME (the client sends `final: true` when the task's
// speaking budget runs out), not on a fixed number of exchanges. This is only a
// safety ceiling so a broken/tampered client can't loop forever: at this many
// interlocutor replies the server grades regardless of what the client asked.
export const MAX_EXCHANGES = 12;

// The exchange itself is always in French (it's a French exam); only the
// final feedback follows the user's UI language, like the one-shot mode.
// The AI plays the CANDIDATE'S INTERLOCUTOR (the person they're talking to),
// NOT an examiner: it reacts briefly and realistically and never helps,
// mirroring how Tâche 2 (Interaction) actually runs.
export const followUpSystem = `Tu es l'interlocuteur de la tâche 2 de l'épreuve d'Expression orale du TCF Canada. Tu joues uniquement le rôle de la personne avec laquelle le candidat échange. Tu ne l'aides jamais, tu ne corriges jamais ses erreurs, tu ne donnes ni idées, ni suggestions, ni vocabulaire. Tu réponds uniquement à la dernière intervention du candidat par UNE phrase courte, naturelle et réaliste, comme le ferait une personne dans une conversation. Ne pose jamais de question, sauf si la consigne de la tâche l'exige explicitement. Tes réponses doivent rester neutres, parfois peu développées, et ne doivent pas relancer la conversation de manière artificielle. Ne sors jamais du contexte de la tâche et n'ajoute aucune explication ou commentaire.
Règles supplémentaires :
- Réponds en une seule phrase complète.
- Maximum 10 à 15 mots.
- Ton naturel, poli et neutre.
- Ne reformule pas les propos du candidat.
- Ne donne aucun conseil, aucune correction et aucun indice.
- Ne fais pas avancer la conversation plus que nécessaire.
- Ne pose aucune question.
- Réagis uniquement à ce que le candidat vient de dire.
Les répliques du candidat sont des transcriptions automatiques (Whisper) : ignore les petites fautes de transcription et ne juge jamais la prononciation.
Réponds UNIQUEMENT avec un objet JSON minifié de cette forme : {"reply":"<ta réponse, en français>"}`;

export const finalSystem = (lang) => `You are a certified TCF Canada examiner grading the Expression orale — Tâche 2 (Interaction). In this task the candidate carries out a real-life exchange (asking for information, making a request, arranging something, etc.) with an interlocutor whose role was played by an assistant; that interlocutor only reacted briefly and never helped. You are given the full dialogue; the candidate's lines are Whisper transcripts, so ignore minor transcription noise and DO NOT judge pronunciation or accent.
Evaluate ONLY the candidate's contributions: relevance to the task, how well they carried out the interaction (asking clear and appropriate questions, reacting to the interlocutor, and sustaining the exchange), vocabulary range, grammar, and fluency/coherence.
Be encouraging but honest and concrete. Estimate a CEFR level (A1, A2, B1, B2, C1 or C2).
Write ALL feedback in ${lang === "en" ? "English" : "French"}.
Respond with ONLY a minified JSON object of this exact shape:
{"level":"<CEFR level>","summary":"<1-2 sentence overall assessment>","strengths":["<2 to 3 short points>"],"improvements":["<2 to 3 short, actionable points>"]}
"strengths" and "improvements" must each contain 2 to 3 items — never leave them empty.`;

// A silent/near-silent recording gets up to this many spoken re-prompts
// ("I didn't hear you, please answer") before the interview stops nagging.
// These re-prompts are NOT exchanges and never enter the dialogue history.
export const MAX_EMPTY_REPROMPTS = 2;

const EMPTY_REPROMPTS = [
  "Je n'ai pas entendu votre réponse. Prenez votre temps, puis répondez à la question.",
  "Je n'ai toujours rien entendu. Vérifiez votre micro et reprenez votre réponse, s'il vous plaît.",
];

// Whisper invents boilerplate captions when handed silence/noise — the most
// common French ones are TV-subtitle and YouTube-outro credits. Normalize the
// transcript (lowercase, strip accents/punctuation) and, if what remains after
// removing these phrases is trivial, treat the whole thing as "nothing said".
const WHISPER_HALLUCINATIONS = [
  "sous titrage societe radio canada",
  "sous titrage st 501",
  "sous titres realises par la communaute d amara org",
  "sous titres faits par la communaute d amara org",
  "merci d avoir regarde cette video",
  "merci d avoir regarde la video",
  "merci a tous et a la prochaine",
  "merci a tous et a bientot",
  "abonnez vous",
  "par soustitreur com",
  "amara org",
  "merci",
].sort((a, b) => b.length - a.length); // strip longest phrases first

function normalizeTranscript(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// True when the recording carries no real speech: empty, near-silent, or only
// a Whisper hallucination (possibly repeated).
function isSilent(transcript) {
  if (!transcript || transcript.replace(/\s/g, "").length < 3) return true;
  let norm = normalizeTranscript(transcript);
  for (const phrase of WHISPER_HALLUCINATIONS) norm = norm.split(phrase).join(" ");
  return norm.replace(/\s/g, "").length < 3;
}

// The client echoes the conversation back each turn; clamp it so a tampered
// payload can't smuggle an arbitrary prompt volume into the billable call.
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 2 + MAX_EXCHANGES * 2)
    .map((m) => ({
      role: m?.role === "examiner" ? "examiner" : "candidate",
      text: String(m?.text || "").trim().slice(0, 2000),
    }))
    .filter((m) => m.text);
}

// Belt-and-braces next to Vercel's own body cap: a base64 payload beyond this
// is not a TCF speaking clip, so refuse it before decoding.
const MAX_AUDIO_B64 = 6_000_000; // ≈ 4.5 MB decoded

function decodeAudio(audio) {
  if (!audio) throw new HttpError(400, "No audio was received.");
  if (typeof audio !== "string" || audio.length > MAX_AUDIO_B64) throw new HttpError(413, "The recording is too large.");
  const buffer = Buffer.from(audio, "base64");
  if (!buffer.length) throw new HttpError(400, "The audio was empty.");
  return buffer;
}

async function dialogueTurn(res, user, body) {
  const { audio = "", mime = "audio/webm", prompt = "", taskLabel = "", lang = "fr" } = body;
  // The client sets this when the task's speaking time has run out: grade now
  // instead of asking for another exchange.
  const timeUp = body.final === true || body.final === "true";
  const buffer = decodeAudio(audio);

  const transcribeStart = Date.now();
  const transcript = await groqTranscribe(buffer, {
    filename: `speech.${extForMime(mime)}`,
    mime,
    language: "fr",
  });
  logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "transcription", model: TRANSCRIBE_MODEL_NAME, audioBytes: buffer.length, durationMs: Date.now() - transcribeStart });

  const history = sanitizeHistory(body.history);

  // Voices an examiner line via the TTS provider; null (no key / API failure)
  // degrades to a text-only turn, spoken client-side if a voice exists there.
  // Character count is metered as "tokens" — neural TTS bills per character.
  const voiceLine = async (line) => {
    const ttsStart = Date.now();
    const tts = await synthesizeFrench(line);
    if (!tts) return {};
    logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "tts", model: TTS_MODEL_NAME, usage: { total_tokens: line.length }, audioBytes: tts.bytes, durationMs: Date.now() - ttsStart });
    return { audio: tts.audio, audioMime: "audio/mpeg" };
  };

  const buildUserMsg = (dialogue) =>
    [
      taskLabel && `Tâche : ${String(taskLabel).slice(0, 200)}`,
      prompt && `Consigne donnée au candidat : ${String(prompt).slice(0, 1000)}`,
      `Dialogue :\n"""\n${dialogue}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");
  const renderDialogue = (turns) => turns.map((m) => `${m.role === "examiner" ? "Interlocuteur" : "Candidat"} : ${m.text}`).join("\n");

  // Nothing intelligible was said (silence, or only a Whisper hallucination).
  // Re-prompt the candidate to answer — up to MAX_EMPTY_REPROMPTS times — WITHOUT
  // asking a new follow-up (these turns never enter `history`). But if the task
  // time is already up, don't re-prompt: close out and grade what was said.
  // Once the cap is hit we also stop nagging and end the interview: grade what
  // was actually said, or, if nothing was, close out.
  if (isSilent(transcript)) {
    const emptyStreak = Math.max(0, Math.min(10, Number(body.emptyStreak) || 0));
    if (!timeUp && emptyStreak < MAX_EMPTY_REPROMPTS) {
      const line = EMPTY_REPROMPTS[Math.min(emptyStreak, EMPTY_REPROMPTS.length - 1)];
      return res.status(200).json({ empty: true, transcript: "", reprompt: line, ...(await voiceLine(line)) });
    }
    if (!history.some((m) => m.role === "candidate")) {
      const line = "Je n'ai pas entendu de réponse. Nous allons nous arrêter ici ; vous pourrez reprendre l'entretien quand vous le souhaitez.";
      return res.status(200).json({ empty: true, capped: true, ended: true, reprompt: line, ...(await voiceLine(line)) });
    }
    const gradeStart = Date.now();
    const { json: rawGrade, usage: gradeUsage } = await groqChatJSON([
      { role: "system", content: finalSystem(lang) },
      { role: "user", content: buildUserMsg(renderDialogue(history)) },
    ]);
    logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "chat", model: CHAT_MODEL_NAME, usage: gradeUsage, durationMs: Date.now() - gradeStart });
    const closing = "Je n'ai pas entendu votre réponse. Nous allons nous arrêter ici. Voici mon évaluation.";
    return res.status(200).json({ empty: true, capped: true, done: true, feedback: normalizeFeedback(rawGrade), closing, ...(await voiceLine(closing)) });
  }

  const exchangesSoFar = history.filter((m) => m.role === "examiner").length;
  const userMsg = buildUserMsg(renderDialogue([...history, { role: "candidate", text: transcript.slice(0, 4000) }]));

  // Keep going (another interlocutor reply) while there is time left and we're
  // under the safety ceiling; otherwise fall through and grade the exchange.
  const chatStart = Date.now();
  if (!timeUp && exchangesSoFar < MAX_EXCHANGES) {
    const { json: raw, usage } = await groqChatJSON([
      { role: "system", content: followUpSystem },
      { role: "user", content: userMsg },
    ]);
    logAiUsage({ userId: user.id, endpoint: "expression-orale-dialogue", kind: "chat", model: CHAT_MODEL_NAME, usage, durationMs: Date.now() - chatStart });
    const reply = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 600) : "";
    if (!reply) throw new HttpError(502, "The AI returned a response we couldn't parse.");
    return res.status(200).json({ transcript, reply, exchange: exchangesSoFar + 1, done: false, ...(await voiceLine(reply)) });
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
    // Premium, or a free account inside the one TCF blanc it is entitled to —
    // the attempt id is verified server-side (see requirePremiumOrFreeMock).
    const user = await requirePremiumOrFreeMock(req, req.body?.attemptId);
    // Transcription + evaluation are billable Groq/Azure calls; cap the pace
    // per account. Generous enough for a real interview (one turn per ~30 s).
    await enforceRateLimit(req, { name: "expr-orale", limit: 30, windowSeconds: 300, userId: user.id });

    if (req.body?.mode === "dialogue") return await dialogueTurn(res, user, req.body);

    const { audio = "", mime = "audio/webm", prompt = "", taskLabel = "", lang = "fr" } = req.body || {};
    const buffer = decodeAudio(audio);

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
      taskLabel && `Tâche : ${String(taskLabel).slice(0, 200)}`,
      prompt && `Consigne : ${String(prompt).slice(0, 1000)}`,
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
