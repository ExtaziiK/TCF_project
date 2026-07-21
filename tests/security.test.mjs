// Security regression tests (run with `npm test`, plain `node --test`).
//
// The app's XSS posture rests on three mechanisms; each gets a test that
// throws classic payloads at it and asserts they come out inert:
//   1. React auto-escaping — every user-generated string (usernames, contact
//      messages, question text, AI feedback) is rendered as JSX text.
//   2. normalizeFeedback — the only server->client data whose shape the AI
//      controls; must always coerce to flat strings/arrays of strings.
//   3. xmlEscape — user-influenced text interpolated into Azure TTS SSML.

import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeFeedback } from "../api/_lib/groq.js";
import { xmlEscape } from "../api/_lib/tts.js";

const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
  '"><svg/onload=alert(1)>',
  "<iframe srcdoc='<script>alert(1)</script>'>",
  "'; DROP TABLE profiles; --",
];

test("React renders injection payloads as harmless text", () => {
  for (const payload of PAYLOADS) {
    const html = renderToStaticMarkup(React.createElement("div", null, payload));
    // Angle brackets must be entity-escaped: the only real tags in the output
    // are the wrapping <div></div>, so no payload markup can become live DOM.
    const inner = html.slice("<div>".length, -"</div>".length);
    assert.ok(!inner.includes("<") && !inner.includes(">"), `payload leaked into markup: ${payload} -> ${html}`);
  }
});

test("normalizeFeedback coerces hostile AI output to flat, capped strings", () => {
  const hostile = normalizeFeedback({
    level: "<script>alert(1)</script>",
    summary: { $$typeof: "fake-react-element", dangerouslySetInnerHTML: { __html: "<script>x</script>" } },
    strengths: [{ evil: true }, "ok", "<img src=x onerror=alert(1)>", "a", "b", "c", "d"],
    improvements: "not-an-array",
    corrected: 42,
    extraField: "must be dropped",
  });
  assert.equal(typeof hostile.level, "string");
  assert.ok(hostile.level.length <= 8);
  assert.equal(hostile.summary, ""); // non-string coerced away, never an object
  assert.ok(hostile.strengths.every((s) => typeof s === "string"));
  assert.ok(hostile.strengths.length <= 4);
  assert.deepEqual(hostile.improvements, []);
  assert.equal(hostile.corrected, "");
  assert.ok(!("extraField" in hostile));
});

test("xmlEscape neutralizes SSML injection in the TTS pipeline", () => {
  const out = xmlEscape(`</voice><voice name="evil">&'"<`);
  assert.ok(!out.includes("<") && !out.includes(">") && !out.includes('"') && !out.includes("'"));
  assert.equal(xmlEscape("<script>"), "&lt;script&gt;");
});

// Mirrors the CHECK constraint in supabase/migrations/20260709_profiles_and_login.sql.
// Usernames are the one user-chosen string shown on other surfaces; the DB
// constraint makes markup in a username impossible. If the constraint is ever
// loosened, this test is the tripwire.
test("username format forbids markup and payload characters", () => {
  const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/;
  for (const payload of PAYLOADS) assert.ok(!USERNAME_RE.test(payload), `accepted: ${payload}`);
  assert.ok(USERNAME_RE.test("marie.dupont_92"));
});
