import { supabase } from "@/services/supabaseClient";
import { getDeviceSessionId } from "@/services/authService";

// Client for the AI evaluation endpoints (api/expression-*). The Groq key
// lives on the server; here we just forward the request with the user's
// Supabase session so the endpoint can authorize it.

export class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status; // 0 = network, 404 = endpoint missing (local `vite`)
  }
}

async function authHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
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

async function postJSON(path, body) {
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError(res.status, data.error || "AI request failed");
  return data;
}

// { level, summary, strengths[], improvements[], corrected }
export function evaluateWriting({ prompt, response, taskLabel, targetWords, lang }) {
  return postJSON("/api/expression-ecrite", { prompt, response, taskLabel, targetWords, lang });
}

// { transcript, level, summary, strengths[], improvements[], empty? }
export function evaluateSpeaking({ audioBase64, mime, prompt, taskLabel, lang }) {
  return postJSON("/api/expression-orale", { audio: audioBase64, mime, prompt, taskLabel, lang });
}

// One turn of the oral-interview simulation. `history` is the dialogue so far
// as [{ role: "examiner" | "candidate", text }]. Returns either the next
// follow-up question ({ transcript, reply, followUp, done: false }) or, once
// the last follow-up has been answered, the final evaluation
// ({ transcript, feedback, closing, done: true }). Examiner lines may carry
// server-synthesized speech ({ audio: <base64>, audioMime }); when absent the
// client falls back to browser TTS. `empty: true` means no speech was
// detected — the caller should re-prompt instead of advancing the dialogue.
export function speakingDialogueTurn({ audioBase64, mime, prompt, taskLabel, history, lang }) {
  return postJSON("/api/expression-orale", { mode: "dialogue", audio: audioBase64, mime, prompt, taskLabel, history, lang });
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
