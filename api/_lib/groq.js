// Shared Groq helpers for the Expression écrite / orale endpoints.
// GROQ_API_KEY is server-side only — it never reaches the browser (these
// functions run on Vercel, the client only calls /api/expression-*).
// Files under api/_lib are ignored by Vercel's router (underscore prefix),
// so this is a plain shared module, not an endpoint.

const GROQ_BASE = "https://api.groq.com/openai/v1";
const CHAT_MODEL = "openai/gpt-oss-20b";
const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function groqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new HttpError(500, "AI is not configured on the server (missing GROQ_API_KEY).");
  return key;
}

// Chat completion that returns the parsed JSON plus Groq's token usage
// (metered into ai_usage_log by the callers). gpt-oss models emit reasoning
// tokens before the answer, so we keep reasoning low, force JSON output, and
// leave a generous token budget for the structured feedback.
export const CHAT_MODEL_NAME = CHAT_MODEL;
export const TRANSCRIBE_MODEL_NAME = TRANSCRIBE_MODEL;

export async function groqChatJSON(messages, { maxTokens = 2000 } = {}) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(502, `Groq chat error (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  try {
    return { json: JSON.parse(content), usage: data?.usage || null };
  } catch {
    throw new HttpError(502, "The AI returned a response we couldn't parse.");
  }
}

// Transcribes an audio buffer with Whisper. Returns the transcript text.
export async function groqTranscribe(buffer, { filename = "audio.webm", mime = "audio/webm", language } = {}) {
  const form = new FormData();
  form.append("model", TRANSCRIBE_MODEL);
  if (language) form.append("language", language);
  form.append("response_format", "json");
  form.append("temperature", "0");
  form.append("file", new Blob([buffer], { type: mime }), filename);

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(502, `Groq transcription error (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.text || "").trim();
}

// Coerces the model's JSON into the exact shape the UI expects, dropping any
// stray/extra fields and capping list lengths so a chatty model can't blow up
// the layout.
export function normalizeFeedback(raw = {}) {
  const list = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, 4) : [];
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    level: str(raw.level).slice(0, 8),
    summary: str(raw.summary),
    strengths: list(raw.strengths),
    improvements: list(raw.improvements),
    corrected: str(raw.corrected),
  };
}
