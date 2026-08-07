// Adapter tests for the second subject source (api/_lib/sujets/formation.js).
//
// That site is a Next.js app: the subjects are public, but they are not in the
// rendered markup — React streams them in the flight payload. The fixtures
// below are trimmed from the real Août 2026 pages, keeping the escaping and the
// two different container shapes the site uses, so the day it changes the
// import fails here rather than publishing nothing (or nonsense).

import { test } from "node:test";
import assert from "node:assert/strict";
import { flightPayload, monthEntries, monthsFrom, parseEE, parseEO } from "../api/_lib/sujets/formation.js";
import { parseMonthLabel } from "../api/_lib/sujets/html.js";

// One flight chunk, escaped exactly as the page ships it.
const chunk = (json) => `self.__next_f.push([1,${JSON.stringify(json)}])`;

test("the flight payload is reassembled from its chunks", () => {
  const html = `<html><body>
    <script>${chunk('{"a":"dé')}</script>
    <script>${chunk('but","b":"fin"}')}</script>
  </body></html>`;
  assert.equal(flightPayload(html), '{"a":"début","b":"fin"}');
});

// écrite nests the month list under a year map, orale ships a flat array, and
// the key above both is generic — so the month objects are matched, not the
// container.
test("months are found under either container shape", () => {
  const nested = chunk('x:{"data":{"2025":[{"name":"Décembre 2025","slug":"decembre-2025","combinaisons":19,"available":true}],"2026":[{"name":"Août 2026","slug":"aot-2026","combinaisons":5,"available":true},{"name":"Février 2026","slug":"fvrier-2026","combinaisons":8,"available":true}]},"years":[2026,2025]}');
  const flat = chunk('y:{"months":[{"name":"Août 2026","slug":"aot-2026","topics":10,"available":true,"year":2026},{"name":"Avril 2026","slug":"avril","topics":160,"available":true,"year":2026}]}');

  const nestedMonths = monthsFrom(flightPayload(`<script>${nested}</script>`), "ee");
  assert.deepEqual(nestedMonths.map((m) => `${m.month} ${m.year}`), ["Août 2026", "Février 2026", "Décembre 2025"], "newest first");
  assert.equal(nestedMonths[0].url, "https://www.formation-tcfcanada.com/epreuve/expression-ecrite/sujets-actualites/aot-2026");

  const flatMonths = monthsFrom(flightPayload(`<script>${flat}</script>`), "eo");
  assert.deepEqual(flatMonths.map((m) => m.month), ["Août", "Avril"]);
  assert.equal(flatMonths[0].url, "https://www.formation-tcfcanada.com/epreuve/expression-orale/sujets-actualites/aot-2026");

  assert.equal(monthEntries(flightPayload(`<script>${nested}</script>`)).length, 3);
});

// The site strips accented letters from its own slugs, so the month is read
// from the label. An earlier version matched "Août 2026" as Juillet because its
// fuzzy pattern made every letter optional — hence the explicit cases.
test("month labels survive the source's mangling, and refuse to guess", () => {
  assert.deepEqual(parseMonthLabel("Août 2026"), { year: 2026, monthNum: 8, month: "Août" });
  assert.deepEqual(parseMonthLabel("Juillet 2026"), { year: 2026, monthNum: 7, month: "Juillet" });
  assert.deepEqual(parseMonthLabel("Février 2026"), { year: 2026, monthNum: 2, month: "Février" });
  assert.equal(parseMonthLabel("Aot 2026").monthNum, 8, "accents dropped outright");
  assert.equal(parseMonthLabel("Fvrier 2026").monthNum, 2);
  assert.equal(parseMonthLabel("Décembre 2025").monthNum, 12);
  assert.equal(parseMonthLabel("2026"), null, "no month named");
  assert.equal(parseMonthLabel("Août"), null, "no year");
});

test("EE: combinaisons are read, and the site's model answers are left behind", () => {
  const flight = flightPayload(`<script>${chunk('z:["$","$L34",null,{"monthData":{"name":"Août 2026","year":2026,"combinaisons":[{"id":746,"titre":"Combinaison 1","tache1":{"sujet":"Vous cherchez un colocataire.","correction":"NE DOIT PAS ÊTRE IMPORTÉ"},"tache2":{"sujet":"Rédigez un article de blog.","correction":"NE DOIT PAS ÊTRE IMPORTÉ"},"tache3":{"titre":"La publicité : pour ou contre ?","document1":{"contenu":"Un premier point de vue.","opinion":"pour"},"document2":{"contenu":"Un point de vue opposé.","opinion":"contre"},"correction":"$35"}}]}}]')}</script>`);
  const ee = parseEE(flight);
  assert.equal(ee.length, 1);
  assert.deepEqual(ee[0], {
    n: 1,
    t1: "Vous cherchez un colocataire.",
    t2: "Rédigez un article de blog.",
    t3: { theme: "La publicité : pour ou contre ?", doc1: "Un premier point de vue.", doc2: "Un point de vue opposé." },
  });
  // The worked answers are their product, and are not exam subjects.
  assert.ok(!JSON.stringify(ee).includes("NE DOIT PAS"), "corrections must never be imported");
});

test("EO: sujets are grouped by the tâche each one declares", () => {
  const flight = flightPayload(`<script>${chunk('w:["$","$L33",null,{"parties":[{"id":2219,"jour":1,"date":"Partie 1","sujets":[{"id":1,"tache":2,"title":"Je reviens d\'un séjour sportif.","description":"","correction":{"exemple":"NE DOIT PAS ÊTRE IMPORTÉ"}},{"id":2,"tache":3,"title":"Quelle influence la télévision a-t-elle ?","description":""},{"id":3,"tache":2,"title":"Je travaille à la billetterie.","description":""}]}]}]')}</script>`);
  const eo = parseEO(flight);
  assert.deepEqual(eo.map((t) => t.tache), [2, 3]);
  assert.deepEqual(eo[0].parties[0].sujets, ["Je reviens d'un séjour sportif.", "Je travaille à la billetterie."]);
  assert.deepEqual(eo[1].parties[0].sujets, ["Quelle influence la télévision a-t-elle ?"]);
  assert.equal(eo[0].parties[0].partie, 1);
  assert.ok(!JSON.stringify(eo).includes("NE DOIT PAS"));
});

test("a page whose shape has changed yields nothing, so the import can refuse", () => {
  const flight = flightPayload(`<script>${chunk('{"unrelated":true}')}</script>`);
  assert.deepEqual(parseEE(flight), []);
  assert.deepEqual(parseEO(flight), []);
  assert.deepEqual(monthsFrom(flight, "ee"), []);
});
