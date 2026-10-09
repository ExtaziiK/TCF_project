// What the candidate is told when an analysis or a recording fails
// (src/utils/aiIssue.js). The rule: a cause they can act on is named, with
// steps — connection, timeout, microphone. Anything else (a Groq refusal, a
// bug of ours) is never explained: "generic", refresh only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { failureKind, failureIssue, micIssue, isInAppBrowser } from "../src/utils/aiIssue.js";

const err = (status, serverReplied) => ({ status, serverReplied });

test("failure kinds", () => {
  assert.equal(failureKind(err(0, false), true), "offline", "dropped connection");
  assert.equal(failureKind(err(500, true), false), "offline", "the device itself is offline");
  assert.equal(failureKind(err(504, false), true), "timeout", "gateway answered: the function was cut off");
  assert.equal(failureKind(err(502, false), true), "timeout");
});

test("our own errors and Groq's are never explained", () => {
  // The endpoint answered with its JSON error — a 500 of ours, a Groq 400
  // relayed as 502: generic, whatever the status.
  assert.equal(failureKind(err(500, true), true), "generic");
  assert.equal(failureKind(err(502, true), true), "generic");
  assert.equal(failureKind(new Error("boom"), true), "generic");
  assert.equal(failureIssue("generic"), null);
});

test("offline and timeout come with steps; the oral adds upload advice", () => {
  assert.match(failureIssue("offline").title, /connexion internet/);
  assert.ok(failureIssue("offline").steps.length >= 2);
  const ee = failureIssue("timeout", "ee").steps.join(" ");
  const eo = failureIssue("timeout", "eo").steps.join(" ");
  assert.doesNotMatch(ee, /Wi-Fi/);
  assert.match(eo, /Wi-Fi/);
});

test("each microphone error gets its own cause", () => {
  assert.match(micIssue("NotAllowedError").title, /refusé/);
  assert.match(micIssue("NotFoundError").title, /Aucun micro/);
  assert.match(micIssue("NotReadableError").title, /autre application/);
  assert.match(micIssue("unsupported").title, /ne permet pas/);
  assert.match(micIssue("silent").title, /rien enregistré/);
  assert.match(micIssue("SomethingNew").title, /n'a pas pu démarrer/);
});

test("inside Facebook's browser, the first step is to leave it", () => {
  for (const code of ["NotAllowedError", "NotReadableError", "silent", "unsupported"]) {
    assert.match(micIssue(code, { inApp: true }).steps[0], /Chrome ou Safari/, code);
    assert.doesNotMatch(micIssue(code, { inApp: false }).steps[0], /navigateur de Facebook/, code);
  }
});

test("in-app browser detection", () => {
  assert.equal(isInAppBrowser("Mozilla/5.0 (Linux; Android 13; wv) Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/483.0;]"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_6) Mobile/15E148 Instagram 350.0"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/129.0.0.0 Mobile Safari/537.36"), false);
});
