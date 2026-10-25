// The "besoin d'aide" dialog asks the candidate to write by email
// (src/components/expression/SupportDialog.jsx): the mailto it opens must
// carry the subject and the technical context, and nothing personal.
import { test } from "node:test";
import assert from "node:assert/strict";

// The component imports React and "@/..." aliases; only the pure mailto
// builder is under test, so read it straight from the source.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/components/expression/SupportDialog.jsx", import.meta.url), "utf8");
const body = src.slice(src.indexOf("const SECTION_NAMES"), src.indexOf("export function SupportDialog"));
const { supportMailto } = await import(`data:text/javascript,${encodeURIComponent(
  `const CONTACT_EMAIL = "contact@tcfpasserelle.com"; const SUPPORT_SUBJECT = "Problème technique — besoin d'assistance";\n${body.replace("export function supportMailto", "export function supportMailto")}`,
)}`);

test("the email goes to the public contact address, with the subject", () => {
  const url = supportMailto({});
  assert.match(url, /^mailto:contact@tcfpasserelle\.com\?subject=/);
  assert.match(decodeURIComponent(url), /Problème technique — besoin d'assistance/);
});

test("the technical context is written into the email", () => {
  const text = decodeURIComponent(supportMailto(
    { issue: "Votre micro n'a rien enregistré.", section: "eo", task: 2 },
    { page: "/expression-orale", online: false, userAgent: "Mozilla/5.0 Test" },
  ));
  assert.match(text, /Message affiché : Votre micro n'a rien enregistré\./);
  assert.match(text, /Épreuve : Expression orale, tâche 2/);
  assert.match(text, /Page : \/expression-orale/);
  assert.match(text, /Connexion : hors ligne/);
  assert.match(text, /Navigateur : Mozilla\/5\.0 Test/);
});

test("no account details are put in the email", () => {
  const text = decodeURIComponent(supportMailto({ issue: "x", section: "eo" }, { page: "/p" }));
  assert.doesNotMatch(text, /@(?!tcfpasserelle)/); // no address other than the contact one
});
