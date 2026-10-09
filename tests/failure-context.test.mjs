// What the admin reads about a failed AI call (api/_lib/device.js,
// api/_lib/admin/usage.js → contextFacts, incidentReason): which device and
// browser, the situation in plain lines, and — for an incident that never
// reached Groq — what it means and what to do about it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeDevice } from "../api/_lib/device.js";
import { buildInsertAttempts } from "../api/_lib/usage.js";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";
const { contextFacts, incidentReason } = await import("../api/_lib/admin/usage.js");

const UA = {
  fbAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/483.0.0.43.109;]",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.79",
  samsung: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
};

test("the Facebook in-app browser is named as such, not as Chrome", () => {
  assert.deepEqual(describeDevice(UA.fbAndroid), { device: "Android", browser: "Facebook (navigateur intégré)" });
});

test("common browsers and devices", () => {
  assert.deepEqual(describeDevice(UA.chromeAndroid), { device: "Android", browser: "Chrome 129" });
  assert.deepEqual(describeDevice(UA.safariIphone), { device: "iPhone", browser: "Safari 17" });
  assert.deepEqual(describeDevice(UA.chromeIphone), { device: "iPhone", browser: "Chrome 129" });
  assert.deepEqual(describeDevice(UA.edgeWindows), { device: "Windows", browser: "Edge 129" });
  assert.deepEqual(describeDevice(UA.samsung), { device: "Android", browser: "Samsung Internet 26" });
  assert.deepEqual(describeDevice(""), { device: "inconnu", browser: "inconnu" });
});

test("context reads as plain facts, most useful first", () => {
  const facts = contextFacts({
    source: "groq", plan: "gratuit", section: "eo", task: 2, mode: "entretien",
    device: "Android", browser: "Facebook (navigateur intégré)",
    audioBytes: 5, mime: "audio/webm;codecs=opus", exchange: 3, final: true,
    freeReturned: true, returned: "could not process file",
  });
  assert.deepEqual(facts, [
    "Compte gratuit",
    "Expression orale · tâche 2 · entretien",
    "Android · Facebook (navigateur intégré)",
    "Enregistrement 5 octets (audio/webm)",
    "Échange n° 3 (noté)",
    "Analyse rendue au candidat",
    "Message renvoyé : « could not process file »",
  ]);
  assert.deepEqual(contextFacts(null), []);
  assert.ok(contextFacts({ plan: "Pro", audioBytes: 48213 }).includes("Enregistrement 47 ko"));
  assert.ok(contextFacts({ plan: "Pro" }).includes("Forfait Pro"));
});

test("what the candidate saw wins over what the server returned", () => {
  const facts = contextFacts({ shown: "Cette page doit être actualisée pour continuer.", returned: "x" });
  assert.deepEqual(facts, ["Message affiché : « Cette page doit être actualisée pour continuer. »"]);
});

test("incidents are named by what they mean, not by their status alone", () => {
  // Status 0 twice, opposite meanings.
  assert.equal(incidentReason(0, { code: "enregistrement-vide", source: "serveur" }).label, "Micro silencieux");
  assert.equal(incidentReason(0, { source: "appareil" }).label, "Connexion perdue");
  assert.equal(incidentReason(0, { source: "appareil", code: "micro" }).label, "Micro inaccessible");
  assert.equal(incidentReason(504, { source: "appareil" }).label, "Délai dépassé");
  assert.equal(incidentReason(413, { source: "serveur" }).label, "Enregistrement trop lourd");
  assert.equal(incidentReason(500, { source: "serveur" }).label, "Erreur interne");
});

test("error_context is the first column dropped on a pre-migration database", () => {
  const BASE = { endpoint: "expression-orale", error_status: 400 };
  const attempts = buildInsertAttempts(BASE, { errorDetail: "d", errorRequest: { a: 1 }, errorContext: { plan: "gratuit" } });
  assert.deepEqual(attempts, [
    { ...BASE, error_detail: "d", error_request: { a: 1 }, error_context: { plan: "gratuit" } },
    { ...BASE, error_detail: "d", error_request: { a: 1 } },
    { ...BASE, error_detail: "d" },
    BASE,
  ]);
});
