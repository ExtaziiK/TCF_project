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

// `temperature` defaults low because the graders must be reproducible; the
// subjects importer raises it, since rewording the same source twice with
// identical output would defeat the point.
export async function groqChatJSON(messages, { maxTokens = 2000, temperature = 0.2 } = {}) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new HttpError(502, `Groq chat error (${res.status}): ${detail.slice(0, 300)}`);
    // Kept on the error so a caller that can wait (the subjects importer) can
    // back off for exactly as long as Groq asks instead of guessing. Groq puts
    // the delay in Retry-After, or in the 429 body as "try again in 8.5275s".
    err.upstreamStatus = res.status;
    const header = Number(res.headers.get("retry-after"));
    const inBody = detail.match(/try again in ([\d.]+)s/i);
    err.retryAfterMs = header > 0 ? header * 1000 : inBody ? Math.ceil(Number(inBody[1]) * 1000) : null;
    throw err;
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
// Loose comparison for checking a quote against the source: apostrophe
// variants, accents and whitespace all drift when a model copies a sentence,
// and none of those differences mean it invented the sentence.
const loose = (v) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘'`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// Sentence-level rewrites: the candidate's own words beside a better version.
//
// `before` is VERIFIED against the text they submitted. A model asked to quote
// will sometimes paraphrase or produce a plausible sentence that was never
// written, and showing someone "your sentence" when it is not theirs destroys
// the credibility of the whole correction. Unverifiable pairs are dropped
// rather than shown with a caveat.
function rewritePairs(raw, source) {
  if (!Array.isArray(raw)) return [];
  const hay = loose(source);
  const out = [];
  // The model sometimes emits the same passage twice, which reads as a bug to
  // the candidate and wastes one of the four to six slots they get.
  const seen = new Set();
  for (const r of raw) {
    const before = typeof r?.before === "string" ? r.before.trim() : "";
    const after = typeof r?.after === "string" ? r.after.trim() : "";
    if (!before || !after) continue;
    if (loose(before) === loose(after)) continue;      // nothing improved
    if (!hay || !hay.includes(loose(before))) continue; // unverifiable, or not theirs
    if (seen.has(loose(before))) continue;              // already shown
    seen.add(loose(before));
    out.push({ before: before.slice(0, 400), after: after.slice(0, 400), why: (typeof r?.why === "string" ? r.why.trim() : "").slice(0, 120) });
    if (out.length === 5) break;
  }
  return out;
}

export function normalizeFeedback(raw = {}, source = "") {
  const list = (v, max = 4) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, max) : [];
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    level: str(raw.level).slice(0, 8),
    summary: str(raw.summary),
    strengths: list(raw.strengths),
    improvements: list(raw.improvements),
    // Expression écrite only: the higher level the rewrite targets, the rewrite
    // itself, and the concrete edits that raise the level. Empty for oral.
    targetLevel: str(raw.targetLevel).slice(0, 8),
    corrected: str(raw.corrected),
    rewrites: rewritePairs(raw.rewrites, source),
  };
}
