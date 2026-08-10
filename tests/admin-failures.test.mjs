// The admin "Appels refusés" panel's two derived fields (api/_lib/admin/usage.js):
//   - candidateContent: what the candidate actually submitted, pulled out of
//     the stored Groq request instead of left buried in raw JSON.
//   - resolvedAfter: whether that candidate went on to get a real analysis
//     shortly after the refusal — the direct answer to "is this a stuck
//     candidate, or did the retry just work".
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";

const { candidateContent, resolvedAfter, RESOLVE_WINDOW } = await import("../api/_lib/admin/usage.js");

test("candidateContent pulls the user message out of a chat request", () => {
  const request = {
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: "You are a certified TCF Canada examiner..." },
      { role: "user", content: "Consigne : ...\nRéponse du candidat :\n\"\"\"\nLes vols low-cost...\n\"\"\"" },
    ],
  };
  const text = candidateContent(request);
  assert.match(text, /Les vols low-cost/);
  assert.doesNotMatch(text, /certified TCF Canada examiner/, "the system prompt is not the candidate's submission");
});

test("candidateContent is null for a transcription request (no text was ever produced)", () => {
  assert.equal(candidateContent({ model: "whisper-large-v3-turbo", mime: "audio/webm", filename: "speech.webm", audioBytes: 48213 }), null);
});

test("candidateContent is null with nothing stored (rows from before the migration)", () => {
  assert.equal(candidateContent(null), null);
});

const iso = (msOffset) => new Date(Date.parse("2026-08-10T14:00:00.000Z") + msOffset).toISOString();
const MIN = 60e3;

test("resolvedAfter finds a later successful call from the same candidate on the same endpoint", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [
    { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(5 * MIN) },
  ];
  assert.equal(resolvedAfter(failure, chatOk), iso(5 * MIN));
});

test("resolvedAfter picks the EARLIEST qualifying success, not just any match", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [
    { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(20 * MIN) },
    { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(5 * MIN) },
  ];
  assert.equal(resolvedAfter(failure, chatOk), iso(5 * MIN));
});

test("resolvedAfter ignores a different candidate", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [{ user_id: "u2", endpoint: "expression-ecrite", created_at: iso(5 * MIN) }];
  assert.equal(resolvedAfter(failure, chatOk), null);
});

test("resolvedAfter ignores a different endpoint (a success in expression-orale doesn't excuse an expression-ecrite refusal)", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [{ user_id: "u1", endpoint: "expression-orale", created_at: iso(5 * MIN) }];
  assert.equal(resolvedAfter(failure, chatOk), null);
});

test("resolvedAfter ignores a success at or before the failure (that analysis came from an earlier attempt)", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(10 * MIN) };
  const chatOk = [{ user_id: "u1", endpoint: "expression-ecrite", created_at: iso(10 * MIN) }, { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(5 * MIN) }];
  assert.equal(resolvedAfter(failure, chatOk), null);
});

test("resolvedAfter ignores a success outside the resolve window (an unrelated later session, not a retry)", () => {
  const failure = { user_id: "u1", endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [{ user_id: "u1", endpoint: "expression-ecrite", created_at: iso(RESOLVE_WINDOW + MIN) }];
  assert.equal(resolvedAfter(failure, chatOk), null);
});

test("resolvedAfter is null for an unattributed refusal (no user_id to match against)", () => {
  const failure = { user_id: null, endpoint: "expression-ecrite", created_at: iso(0) };
  const chatOk = [{ user_id: "u1", endpoint: "expression-ecrite", created_at: iso(5 * MIN) }];
  assert.equal(resolvedAfter(failure, chatOk), null);
});
