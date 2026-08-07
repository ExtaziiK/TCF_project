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
import { toLines, parseEE, parseEO, monthLinks, countSubjects } from "../api/_lib/sujetsSource.js";

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
