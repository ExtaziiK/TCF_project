// Shared Groq helpers for the Expression écrite / orale endpoints.
// GROQ_API_KEY is server-side only — it never reaches the browser (these
// functions run on Vercel, the client only calls /api/expression-*).
// Files under api/_lib are ignored by Vercel's router (underscore prefix),
// so this is a plain shared module, not an endpoint.

import { levelsFromScore } from "./levels.js";

const GROQ_BASE = "https://api.groq.com/openai/v1";
// Groq meters TOKENS PER MODEL — the 429 body names the model whose bucket is
// spent — so a second model is a second daily allowance, not just a retry.
// Tried in order; the fallback is only reached when the one before it is rate
// limited.
//
// `groq/compound` is deliberately NOT here. It looks like a third option but
// runs ON gpt-oss-120b: a request to compound while 120b is saturated comes
// back "Rate limit reached for model `openai/gpt-oss-120b`". It would share the
// bucket it is meant to relieve.
//
// 20b leads because it is the cheaper model and has been producing the grades
// measured against the rubric; 120b is the relief valve, not the default.
// llama grades the same texts two to four points high — 16/20 C2 where the
// gpt-oss pair says 12/20 B2 — and the inflation is not linear: accurate at A2,
// +2 at B1, +2 to +4 at B2. This anchor closed about half that gap in testing
// (16 -> 14 on the reference text). It does NOT make llama equivalent, and it
// is attached to llama alone so the primary's calibration is untouched.
const LLAMA_CALIBRATION = `
CALIBRATION — you grade too generously; correct for it.
A text that argues clearly with varied vocabulary, real connectors and controlled subordination, with only occasional errors, is 12/20 (B2). It is NOT 15 or 16. Reserve 14-15 for genuinely nuanced writing with idiomatic range, and 16+ for near-native work you would not correct.
A text of short juxtaposed sentences with repeated basic vocabulary and frequent errors is 4-5/20 (A2).
Before answering, check your overall score against these two anchors and lower it if it sits above the first without clearly earning it.`;

const CHAT_MODELS = [
  { id: "openai/gpt-oss-20b" },
  { id: "openai/gpt-oss-120b" },
  // Third bucket (100K/day of its own), reached only when both gpt-oss models
  // are spent. A grade from here is not interchangeable with the ones above —
  // ai_usage_log records which model served each call, so a run of llama grades
  // is identifiable if a candidate ever disputes one.
  { id: "llama-3.3-70b-versatile", calibration: LLAMA_CALIBRATION },
];
const CHAT_MODEL = CHAT_MODELS[0].id;

// Groq's tokens-per-day allowance for each chat model, from the account's
// Limits page. A ROLLING 24-hour window, not a midnight reset — spend ages out
// of it gradually, which is why a saturated bucket recovers minute by minute.
//
// Kept here beside the models rather than in the dashboard: it is a fact about
// the model, and the admin should not carry its own copy that can drift from
// the chain actually being called. Whisper is metered in audio seconds, not
// tokens, so it has no entry.
export const MODEL_DAILY_TOKENS = {
  "openai/gpt-oss-20b": 200_000,
  "openai/gpt-oss-120b": 200_000,
  "llama-3.3-70b-versatile": 100_000,
};
export const CHAT_MODEL_IDS = CHAT_MODELS.map((m) => m.id);
const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

// How much of Groq's raw error body a REFUSED call keeps, in ai_usage_log
// (error_detail). Generous: Groq's error bodies are normally one short JSON
// sentence, so this is headroom for the rare verbose one, not a working limit.
const DETAIL_CAP = 2000;

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
  let res, model, body;
  // Only a 429 moves to the next model. Anything else — a malformed request, an
  // unparseable reply — would fail identically everywhere, and retrying it just
  // spends a second model's allowance to reach the same error.
  for (const candidate of CHAT_MODELS) {
    model = candidate.id;
    // A per-model note is appended to the FIRST system message rather than sent
    // as a separate one: some models weight a trailing system turn oddly, and
    // the calibration has to be read as part of the instructions, not after
    // them.
    const payload = candidate.calibration
      ? messages.map((m, i) => (i === messages.findIndex((x) => x.role === "system")
        ? { ...m, content: m.content + candidate.calibration }
        : m))
      : messages;
    // Hoisted to the outer scope (not an inline object in the fetch call) so
    // that on failure, err.requestPayload below can attach the EXACT body of
    // whichever attempt actually got refused — the last one, since the loop
    // only reruns on a 429.
    body = { model, messages: payload, temperature, max_tokens: maxTokens, reasoning_effort: "low", response_format: { type: "json_object" } };
    res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // A saturated upstream is not a broken app, and must not read like one. 429
    // means Groq's per-minute or per-day allowance is spent: the candidate did
    // nothing wrong, their text is fine, and waiting fixes it. Surfacing that as
    // a bare 502 "l'analyse a échoué" invites them to retry immediately, which
    // only deepens the hole, and to conclude the product is broken.
    // Status 429 so the workshops pass the message through verbatim.
    const mins = Number(detail.match(/try again in (?:(\d+)m)?([\d.]+)s/)?.[1] || 0);
    const err = res.status === 429
      ? new HttpError(429, mins > 0
        ? `L'analyse IA est momentanément saturée. Réessayez dans ${mins + 1} minutes.`
        : "L'analyse IA est momentanément saturée. Réessayez dans quelques minutes.")
      : new HttpError(502, `Groq chat error (${res.status}): ${detail.slice(0, 300)}`);
    // Kept on the error so a caller that can wait (the subjects importer) can
    // back off for exactly as long as Groq asks instead of guessing. Groq puts
    // the delay in Retry-After, or in the 429 body as "try again in 8.5275s".
    err.upstreamStatus = res.status;
    // The model that actually refused — the LAST one tried, i.e. the end of the
    // fallback chain. Callers used to meter the failure against CHAT_MODEL_NAME,
    // so every 429 in the admin was blamed on the primary even though the whole
    // chain was spent; the dashboard read "20b refuses" while 120b and llama had
    // already been tried and refused too.
    err.model = model;
    // Groq's own sentence, which names the exhausted bucket and the wait. It is
    // deliberately NOT what the candidate sees (they get the reassuring French
    // message above) — it goes to ai_usage_log so the admin can tell a spent
    // quota from a bad key without opening Groq's console.
    err.upstreamDetail = detail.replace(/\s+/g, " ").trim().slice(0, DETAIL_CAP) || null;
    // The exact request that got refused — model, full messages (system prompt
    // and any per-model calibration included, exactly as sent), temperature,
    // max_tokens. Only attached on failure: a successful call has nothing to
    // investigate, and duplicating every candidate's text into the log for
    // calls that worked fine would be pure cost for no benefit.
    err.requestPayload = body;
    const header = Number(res.headers.get("retry-after"));
    const inBody = detail.match(/try again in ([\d.]+)s/i);
    err.retryAfterMs = header > 0 ? header * 1000 : inBody ? Math.ceil(Number(inBody[1]) * 1000) : null;
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  try {
    // `model` travels back so ai_usage_log records which one served the call —
    // otherwise a day spent entirely on the fallback looks like a normal day.
    return { json: JSON.parse(content), usage: data?.usage || null, model };
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
    const err = new HttpError(502, `Groq transcription error (${res.status}): ${detail.slice(0, 300)}`);
    // Same contract as the chat path, so a transcription refusal is metered
    // with its real status and reason rather than a flat 502 with no cause.
    err.upstreamStatus = res.status;
    err.model = TRANSCRIBE_MODEL;
    err.upstreamDetail = detail.replace(/\s+/g, " ").trim().slice(0, DETAIL_CAP) || null;
    // Metadata only — never the audio itself. The clip is what a candidate
    // spoke; logging it into a diagnostic table is a privacy step this
    // feature has no reason to take, and the metadata is what actually
    // distinguishes a working call from a refused one.
    err.requestPayload = { model: TRANSCRIBE_MODEL, mime, filename, audioBytes: buffer.length, language: language || null };
    throw err;
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
  // The CEFR letter and the NCLC are DERIVED from the /20 score through the
  // official IRCC table, never taken from the model. Asked for both, a model
  // will cheerfully return a level and a score that do not correspond, and the
  // candidate has no way to tell which one to believe.
  const graded = levelsFromScore(raw.score);
  const crit = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(20, Math.round(n))) : null;
  };
  return {
    score: graded.score,
    nclc: graded.nclc,
    criteria: raw.criteria && typeof raw.criteria === "object"
      ? Object.fromEntries(Object.entries(raw.criteria).map(([k, v]) => [k, crit(v)]).filter(([, v]) => v !== null))
      : {},
    level: graded.level,
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
