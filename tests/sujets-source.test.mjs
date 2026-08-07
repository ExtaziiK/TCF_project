// Parser tests for the monthly subjects importer (api/_lib/sujetsSource.js).
//
// The importer scrapes a site we don't control: the day its markup or wording
// shifts, the admin "Générer" button must fail loudly rather than publish
// mangled subjects. These fixtures mirror the real pages as of 2026-08 —
// entity-encoded apostrophes, word-count lines, the surrounding page furniture
// and the tail after the last subject — so a parser that starts swallowing
// chrome or dropping fields fails here first.
//
// The reformulation step is deliberately untested: it calls Groq. What is
// tested is everything that decides WHICH text gets sent and where it lands.

import { test } from "node:test";
import assert from "node:assert/strict";
import { toLines, parseEE, parseEO, monthLinks, countSubjects, sourceKey, provenanceKeys, selectNew, mergeMonth } from "../api/_lib/sujetsSource.js";

const CHROME_HEAD = `
  <p>Août 2026</p><p>Sujets d'actualité</p><p>Attention!</p>
  <p>Ces contenus sont inspirés de vrais essais ! Ils ne constituent pas les originaux.</p>
  <p>&times;</p><p>Consignes</p><p>Formations</p><p>Exemples corrigés</p>`;
const CHROME_TAIL = `<p>Réussir l'expression écrite</p><p>Pour partager les sujets de votre session:</p>`;

const EE_HTML = `<html><body><article>${CHROME_HEAD}
  <h2>Combinaison 4</h2>
  <h3>Tâche 1</h3>
  <p>Votre amie Anna pr&eacute;voit de passer un week-end dans votre ville.</p>
  <p>(60 mots minimum/120 mots maximum)</p>
  <h3>Tâche 2</h3>
  <p>Vous avez assist&eacute; &agrave; une f&ecirc;te de quartier.<br>Racontez-la sur votre blog.</p>
  <p>(120 mots minimum/150 mots maximum)</p>
  <h3>Tâche 3</h3>
  <p>Distributeurs dans les lyc&eacute;es : avantages et inconv&eacute;nients</p>
  <p>Document 1 :</p>
  <p>Certains estiment que l&rsquo;installation de distributeurs est un atout.</p>
  <p>Document 2 :</p>
  <p>D&rsquo;autres considèrent qu&rsquo;ils favorisent les produits sucrés.</p>
  <h2>Combinaison 3</h2>
  <h3>Tâche 1</h3><p>Quelle place occupe le sport dans votre vie ?</p>
  <p>(60 mots minimum/120 mots maximum)</p>
  <h3>Tâche 2</h3><p>Vous avez séjourné dans une magnifique région.</p>
  <h3>Tâche 3</h3><p>École privée : quels enjeux ?</p>
  <p>Document 1 : Les écoles privées ont accueilli plus d'élèves.</p>
  <p>Document 2 : Les frais de scolarité sont un obstacle.</p>
  ${CHROME_TAIL}</article></body></html>`;

const EO_HTML = `<html><body><article>
  <p>Août 2026</p><p>Sujets d'actualité</p><p>Attention !</p><p>&times;</p><p>Corrections</p>
  <h2>Tâche 2</h2>
  <h3>Partie 4</h3>
  <p>Sujet 1</p><p>Je suis un(e) ami(e). Vous voulez faire go&ucirc;ter des spécialités québécoises.</p>
  <p>Sujet 2</p><p>Je suis un(e) ami(e). Je connais quelqu&rsquo;un qui enseigne la cuisine.</p>
  <h3>Partie 1</h3>
  <p>Sujet 1 : Je suis un(e) ami(e). Je m&rsquo;installe à l&rsquo;étranger.</p>
  <h2>Tâche 3</h2>
  <h3>Partie 2</h3>
  <p>Sujet 1</p><p>Que pensez-vous des gens qui ne regardent jamais la télévision ?</p>
  <p>Réussir l'expression orale</p><p>Pour partager les sujets de votre session:</p>
  </article></body></html>`;

test("EE: parses combinaisons, decodes entities and drops page chrome", () => {
  const ee = parseEE(toLines(EE_HTML));
  assert.equal(ee.length, 2);
  assert.deepEqual(ee.map((s) => s.n), [1, 2], "numbered in page order — newest combinaison first");

  const [first] = ee;
  assert.equal(first.t1, "Votre amie Anna prévoit de passer un week-end dans votre ville.");
  assert.equal(first.t2, "Vous avez assisté à une fête de quartier. Racontez-la sur votre blog.", "<br> joins into one énoncé");
  assert.equal(first.t3.theme, "Distributeurs dans les lycées : avantages et inconvénients");
  assert.equal(first.t3.doc1, "Certains estiment que l’installation de distributeurs est un atout.");
  assert.equal(first.t3.doc2, "D’autres considèrent qu’ils favorisent les produits sucrés.");

  // The two failure modes that would silently publish garbage.
  const all = JSON.stringify(ee);
  assert.ok(!/mots (minimum|maximum)/.test(all), "word-count lines are constraints, not subject text");
  for (const noise of ["Réussir l", "Pour partager", "Exemples corrigés", "Consignes", "Attention"]) {
    assert.ok(!all.includes(noise), `page chrome leaked into the subjects: ${noise}`);
  }
});

// Both taken from the live pages: the source colours a few words mid-word with
// a <span>, and trails a stray space before the closing period.
test("inline markup inside a word does not split it, and stray spacing is tidied", () => {
  const html = `<article><h2>Tâche 2</h2><h3>Partie 1</h3><p>Sujet 1</p>
    <p><strong>J'ai mis cer<span style="color:#00ccff">tains objets en vente (meubles, tarifs, etc.) .</span></strong></p></article>`;
  const [sujet] = parseEO(toLines(html))[0].parties[0].sujets;
  assert.equal(sujet, "J'ai mis certains objets en vente (meubles, tarifs, etc.).");
});

test("French spacing before ? ! : ; is preserved", () => {
  const html = `<article><h2>Tâche 3</h2><h3>Partie 1</h3><p>Sujet 1</p>
    <p>Est-il possible de connaître un pays ? Pourquoi ?</p></article>`;
  assert.equal(parseEO(toLines(html))[0].parties[0].sujets[0], "Est-il possible de connaître un pays ? Pourquoi ?");
});

test("EE: reads a document written inline after its label", () => {
  const [, second] = parseEE(toLines(EE_HTML));
  assert.equal(second.t3.doc1, "Les écoles privées ont accueilli plus d'élèves.");
  assert.equal(second.t3.doc2, "Les frais de scolarité sont un obstacle.");
});

test("EO: groups sujets by tâche and partie, ascending", () => {
  const eo = parseEO(toLines(EO_HTML));
  assert.deepEqual(eo.map((t) => t.tache), [2, 3]);
  assert.deepEqual(eo[0].parties.map((p) => p.partie), [1, 4], "parties are stored ascending, not in page order");

  const partie4 = eo[0].parties.find((p) => p.partie === 4);
  assert.equal(partie4.sujets.length, 2);
  assert.equal(partie4.sujets[0], "Je suis un(e) ami(e). Vous voulez faire goûter des spécialités québécoises.");
  assert.equal(eo[0].parties.find((p) => p.partie === 1).sujets[0], "Je suis un(e) ami(e). Je m’installe à l’étranger.");
  assert.equal(eo[1].parties[0].sujets[0], "Que pensez-vous des gens qui ne regardent jamais la télévision ?");
  assert.equal(countSubjects("eo", eo), 4);
});

test("a page that no longer matches yields nothing, so the import can refuse", () => {
  const html = "<html><body><article><h1>Page introuvable</h1><p>Rien ici.</p></article></body></html>";
  assert.equal(countSubjects("ee", parseEE(toLines(html))), 0);
  assert.equal(countSubjects("eo", parseEO(toLines(html))), 0);
});

test("month links are read from the slug and sorted newest first", () => {
  const index = `
    <a href="https://reussir-tcfcanada.com/juillet-2026-expression-ecrite/">Juillet</a>
    <a href="https://reussir-tcfcanada.com/aout-2026-expression-ecrite/">Août</a>
    <a href="/decembre-2025-expression-ecrite/">Decembre 2024</a>
    <a href="https://reussir-tcfcanada.com/aout-2026-expression-orale/">autre épreuve</a>
    <a href="https://reussir-tcfcanada.com/tarifs/">hors sujet</a>`;
  const links = monthLinks(index, "ee");
  assert.deepEqual(
    links.map((l) => `${l.year}-${l.monthNum}`),
    ["2026-8", "2026-7", "2025-12"],
    "only this épreuve's month pages, newest first",
  );
  assert.equal(links[0].url, "https://reussir-tcfcanada.com/aout-2026-expression-ecrite/");
  assert.equal(links[0].month, "Août");
  // The label in the anchor is wrong on the real site ("Decembre 2024" for a
  // 2025 page); the slug is what we trust.
  assert.equal(links[2].url, "https://reussir-tcfcanada.com/decembre-2025-expression-ecrite/");
});

/* --------------------- re-running the import mid-month --------------------- */
//
// The button gets pressed several times a month as the source publishes more
// combinaisons. Because a first run REWORDS what it imports, the second run
// cannot recognise its own work by comparing text — it matches on a fingerprint
// of the source instead. These tests pin that down: the danger is silently
// re-importing subjects that are already published.

test("a source fingerprint survives cosmetic drift but not a rewrite", () => {
  const original = "Je suis un(e) ami(e). Vous cherchez un emploi (tenue, préparation, etc.).";
  assert.equal(sourceKey(original), sourceKey(original), "stable");
  assert.equal(sourceKey(original), sourceKey("JE SUIS UN(E) AMI(E). Vous cherchez un emploi (tenue, préparation, etc.)."), "casing");
  assert.equal(sourceKey(original), sourceKey("Je suis un(e) ami(e) : vous cherchez un emploi — tenue, préparation, etc."), "punctuation");
  assert.equal(sourceKey(original), sourceKey("Je suis un(e) ami(e). Vous cherchez un emploi (tenue, preparation, etc.)."), "accents");
  assert.notEqual(sourceKey(original), sourceKey("Je suis votre voisin(e). Vous cherchez un emploi (tenue, préparation, etc.)."), "different subject");
  // A rewording is a different subject as far as matching goes — which is
  // exactly why the fingerprint is taken from the source, never from what we
  // publish.
  assert.notEqual(sourceKey(original), sourceKey("Je suis un(e) ami(e). Un entretien vous attend (tenue, préparation, etc.)."));
});

test("EE: a re-run imports only the combinaison that appeared since", () => {
  const page = (combis) => `<article>${combis.map((n) => `
    <h2>Combinaison ${n}</h2>
    <h3>Tâche 1</h3><p>Premier énoncé numéro ${n}.</p>
    <h3>Tâche 2</h3><p>Second énoncé numéro ${n}.</p>
    <h3>Tâche 3</h3><p>Thème ${n}</p>
    <p>Document 1 :</p><p>Un premier point de vue sur le thème ${n}.</p>
    <p>Document 2 :</p><p>Un point de vue opposé sur le thème ${n}.</p>`).join("")}</article>`;

  // First run: two combinaisons, imported and (in reality) reworded.
  const first = selectNew("ee", parseEE(toLines(page([2, 1]))), new Set());
  assert.equal(first.length, 2);
  assert.ok(first.every((s) => s.src), "every imported combinaison carries its source fingerprint");
  // Stand in for the rewording, which changes every string we publish.
  const published = first.map((s, i) => ({ ...s, n: i + 1, t1: `REFORMULÉ ${i}`, t2: `REFORMULÉ ${i}`, t3: { ...s.t3, theme: `REFORMULÉ ${i}` } }));

  // Second run: the source has added Combinaison 3 on top.
  const seen = provenanceKeys("ee", published);
  assert.equal(seen.size, 2);
  const fresh = selectNew("ee", parseEE(toLines(page([3, 2, 1]))), seen);
  assert.equal(fresh.length, 1, "only the new combinaison, despite the published ones reading differently now");
  assert.equal(fresh[0].t3.theme, "Thème 3");

  const merged = mergeMonth("ee", published, fresh);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((s) => s.n), [1, 2, 3], "renumbered in place");
  assert.equal(merged[0].t3.theme, "Thème 3", "the newest combinaison leads, as on the source");
  assert.deepEqual(merged.slice(1).map((s) => s.t1), ["REFORMULÉ 0", "REFORMULÉ 1"], "already-published wording is left alone");

  // Third run with nothing new on the source must add nothing at all.
  assert.equal(selectNew("ee", parseEE(toLines(page([3, 2, 1]))), provenanceKeys("ee", merged)).length, 0);
});

test("EO: a re-run adds new sujets into their partie and leaves the rest alone", () => {
  const page = (sujets) => `<article><h2>Tâche 2</h2><h3>Partie 1</h3>
    ${sujets.map((s) => `<p>Sujet 1</p><p>${s}</p>`).join("")}</article>`;

  const first = selectNew("eo", parseEO(toLines(page(["Énoncé A.", "Énoncé B."]))), new Set());
  assert.deepEqual(first[0].parties[0].sujets, ["Énoncé A.", "Énoncé B."]);
  assert.equal(first[0].parties[0].src.length, 2, "the partie records which source items it holds");

  const published = [{ tache: 2, parties: [{ partie: 1, sujets: ["A reformulé.", "B reformulé."], src: first[0].parties[0].src }] }];
  const fresh = selectNew("eo", parseEO(toLines(page(["Énoncé A.", "Énoncé B.", "Énoncé C."]))), provenanceKeys("eo", published));
  assert.equal(countSubjects("eo", fresh), 1);

  const merged = mergeMonth("eo", published, fresh);
  assert.deepEqual(merged[0].parties[0].sujets, ["A reformulé.", "B reformulé.", "Énoncé C."]);
  assert.equal(merged[0].parties[0].src.length, 3);
  assert.equal(countSubjects("eo", selectNew("eo", parseEO(toLines(page(["Énoncé A.", "Énoncé B.", "Énoncé C."]))), provenanceKeys("eo", merged))), 0);
});

test("EO merge creates a missing tâche/partie and keeps both sorted", () => {
  const published = [{ tache: 3, parties: [{ partie: 2, sujets: ["déjà là"], src: ["deadbeef0001"] }] }];
  const fresh = [
    { tache: 2, parties: [{ partie: 4, sujets: ["nouveau T2P4"], src: ["aaaa00000001"] }] },
    { tache: 3, parties: [{ partie: 1, sujets: ["nouveau T3P1"], src: ["bbbb00000002"] }] },
  ];
  const merged = mergeMonth("eo", published, fresh);
  assert.deepEqual(merged.map((t) => t.tache), [2, 3]);
  assert.deepEqual(merged[1].parties.map((p) => p.partie), [1, 2]);
  assert.deepEqual(merged[1].parties.find((p) => p.partie === 2).sujets, ["déjà là"], "untouched");
});

test("a month with no fingerprints yields no keys, so the import must not merge blindly", () => {
  // Hand-typed months, and anything saved before provenance existed, have no
  // `src`. Reporting zero keys is what makes importLatest choose "replace"
  // instead of appending a second copy of every subject.
  assert.equal(provenanceKeys("ee", [{ n: 1, t1: "a", t2: "b", t3: { theme: "t" } }]).size, 0);
  assert.equal(provenanceKeys("eo", [{ tache: 2, parties: [{ partie: 1, sujets: ["x"] }] }]).size, 0);
});
