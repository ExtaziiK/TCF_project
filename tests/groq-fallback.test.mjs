// The model fallback in api/_lib/groq.js.
//
// Groq meters tokens PER MODEL, so a second model is a second daily allowance
// rather than a retry of the same one. On 2026-08-07 the primary's 24-hour
// bucket was exhausted and every analysis on the site failed; the fallback
// exists so that stops being an outage.
//
// Stubbed rather than live: proving this against the real API would mean
// deliberately exhausting a model's daily quota, which is what we are trying to
// avoid. What matters is the routing rule, and that is ours to test.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.GROQ_API_KEY = "test-key";
process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";

const { groqChatJSON } = await import("../api/_lib/groq.js");

const reply = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const ok = () => reply({ choices: [{ message: { content: '{"score":12}' } }], usage: { total_tokens: 1 } });
const rateLimited = () =>
  new Response(JSON.stringify({ error: { message: "Rate limit reached ... try again in 8m34.9s" } }), { status: 429 });

// Records which models were asked, in order.
function stub(responder) {
  const asked = [];
  globalThis.fetch = async (_url, init) => {
    const model = JSON.parse(init.body).model;
    asked.push(model);
    return responder(model);
  };
  return asked;
}

const real = globalThis.fetch;
test.after(() => { globalThis.fetch = real; });

test("uses the primary model when it answers, and asks no other", async () => {
  const asked = stub(() => ok());
  const { model } = await groqChatJSON([{ role: "user", content: "x" }]);
  assert.equal(asked.length, 1, "a working primary must not spend a second model's allowance");
  assert.equal(model, "openai/gpt-oss-20b");
});

test("falls through to the next model when the primary is rate limited", async () => {
  const asked = stub((m) => (m === "openai/gpt-oss-20b" ? rateLimited() : ok()));
  const { model } = await groqChatJSON([{ role: "user", content: "x" }]);
  assert.deepEqual(asked, ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
  // Reported back so ai_usage_log records who actually served it — otherwise a
  // day spent entirely on the fallback is indistinguishable from a normal one.
  assert.equal(model, "openai/gpt-oss-120b");
});

test("a non-429 failure does NOT fall through", async () => {
  // A malformed request fails identically on every model. Retrying it only
  // spends the fallback's allowance to arrive at the same error.
  const asked = stub(() => new Response(JSON.stringify({ error: { message: "bad request" } }), { status: 400 }));
  await assert.rejects(() => groqChatJSON([{ role: "user", content: "x" }]));
  assert.deepEqual(asked, ["openai/gpt-oss-20b"]);
});

test("every model rate limited surfaces a saturation message, not a raw 502", async () => {
  stub(() => rateLimited());
  await assert.rejects(
    () => groqChatJSON([{ role: "user", content: "x" }]),
    (err) => {
      assert.equal(err.status, 429, "the workshops pass 429 messages through verbatim");
      assert.match(err.message, /saturé/, "the candidate is told to wait, not that the analysis failed");
      return true;
    },
  );
});
