import { supabase } from "@/services/supabaseClient";
import { getDeviceSessionId } from "@/services/authService";
import { getFreeMockAttemptId } from "@/utils/freeMockAttempt";

// Client for the AI evaluation endpoints (api/expression-*). The Groq key
// lives on the server; here we just forward the request with the user's
// Supabase session so the endpoint can authorize it.

export class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status; // 0 = network, 404 = endpoint missing (local `vite`)
  }
}

// The access token has to be FRESH, not merely present. These endpoints are
// called after long idle stretches — the oral workshop in particular sits for
// minutes between recording and analysis — and the server verifies the token
// against Supabase, so a stale one comes back 401 "Invalid or expired session"
// with nothing the candidate can act on. Refresh slightly ahead of expiry
// rather than waiting to be refused.
const TOKEN_SKEW_MS = 60_000;

async function currentToken() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;
  const expiresAt = (session?.expires_at || 0) * 1000;
  if (session && expiresAt && expiresAt - Date.now() < TOKEN_SKEW_MS) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed?.session?.access_token || session.access_token;
  }
  return session?.access_token;
}

async function authHeaders() {
  try {
    const token = await currentToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // Lets the server refuse a device whose single-active-session id was
    // superseded by a newer login, even while its JWT is still valid.
    const deviceSession = getDeviceSessionId();
    if (deviceSession) headers["x-device-session"] = deviceSession;
    return headers;
  } catch {
    return {};
  }
}

async function postJSON(path, body, { retriedAuth = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiError(0, "network");
  }
  // Plain `vite dev` has no serverless routes → 404. Surface it distinctly so
  // callers can fall back gracefully instead of showing a hard error.
  if (res.status === 404) throw new AiError(404, "unavailable");
  // A token can also be revoked or expire mid-flight (the refresh above only
  // covers what the client can see). Force one refresh and replay before
  // giving up — losing a recording to a stale token is not something the
  // candidate can do anything about. Once only, so a genuinely dead session
  // fails fast instead of looping.
  if (res.status === 401 && !retriedAuth) {
    const { data } = await supabase.auth.refreshSession().catch(() => ({ data: null }));
    if (data?.session) return postJSON(path, body, { retriedAuth: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError(res.status, data.error || "AI request failed");
  return data;
}

// { level, summary, strengths[], improvements[], corrected }
// `attemptId` is only needed by a FREE account: it names the one TCF blanc
// they are entitled to, which the server verifies before allowing the call
// (requirePremiumOrFreeMock). Premium users may omit it.
// `task` is the tache number (1-3). A free account is allowed two analyses
// per tache, counted server-side, so the endpoint needs to know which one.
export function evaluateWriting({ prompt, response, taskLabel, targetWords, lang, attemptId, task }) {
  return postJSON("/api/expression-ecrite", { prompt, response, taskLabel, targetWords, lang, task, attemptId: attemptId ?? getFreeMockAttemptId() });
}

// { transcript, level, summary, strengths[], improvements[], empty? }
export function evaluateSpeaking({ audioBase64, mime, prompt, taskLabel, lang, attemptId, task }) {
  return postJSON("/api/expression-orale", { audio: audioBase64, mime, prompt, taskLabel, lang, task, attemptId: attemptId ?? getFreeMockAttemptId() });
}

// One turn of the oral-interview simulation. `history` is the dialogue so far
// as [{ role: "examiner" | "candidate", text }]. Returns either the next
// interlocutor reply ({ transcript, reply, exchange, done: false }) or, when the
// task's speaking time is up (`final: true`), the final evaluation
// ({ transcript, feedback, closing, done: true }). Examiner lines may carry
// server-synthesized speech ({ audio: <base64>, audioMime }); when absent the
// client falls back to browser TTS. `empty: true` means no speech was
// detected — the caller should re-prompt instead of advancing the dialogue.
export function speakingDialogueTurn({ audioBase64, mime, prompt, taskLabel, history, emptyStreak, lang, final, attemptId, task }) {
  return postJSON("/api/expression-orale", { mode: "dialogue", audio: audioBase64, mime, prompt, taskLabel, history, emptyStreak, lang, final, task, attemptId: attemptId ?? getFreeMockAttemptId() });
}

// Reads a recorded Blob as a bare base64 string (no data: prefix).
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the recording."));
    reader.readAsDataURL(blob);
  });
}
