// Detecting a consigne submitted back as an answer (api/_lib/copiedPrompt.js).
//
// A candidate selects the subject to read it, pastes into the answer box by
// reflex, and submits. The grader noticed on one run and missed it on the next
// — and grading the copied documents as the candidate's own prose awards a
// level for text they did not write, which is worse than no analysis at all.
//
// Deterministic check, so it belongs in code. These fixtures are the real
// subject and a real answer to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copiedShare, COPIED_HARD, COPIED_WARN } from "../api/_lib/copiedPrompt.js";

const CONSIGNE = `« Produits Maison : Une Alternative Intéressante ou une Contrainte ? »
Document 1 : Préparer ses produits biologiques à la maison offre un contrôle total sur leur composition, garantissant des solutions saines et adaptées. Cette pratique permet aussi de limiter l'usage de plastique grâce à des emballages réutilisables. Elle représente une alternative économique et enrichissante qui favorise un mode de vie plus responsable et écologique.
Document 2 : La production de produits biologiques maison n'est pas sans inconvénients. Une erreur dans la formulation peut altérer leur efficacité ou provoquer des réactions indésirables. De plus, rassembler et préparer les ingrédients peut être fastidieux. L'absence de certification garantit moins de sécurité et favorise le risque de contamination bactérienne en cas de mauvaise conservation. Enfin, l'investissement de départ pour des ingrédients de qualité peut être un obstacle pour certains.
Deux points de vue s'opposent sur cette question. Rédigez un texte argumenté dans lequel vous exposez votre opinion, à l'aide d'arguments et d'exemples.`;

// A genuine answer that QUOTES the documents, as an argumentative text should.
const REAL_ANSWER = `Fabriquer ses produits ménagers séduit de plus en plus de foyers, et la question mérite d'être posée sérieusement.
D'un côté, le premier document rappelle que cette pratique "offre un contrôle total sur leur composition". C'est vrai : on sait ce que l'on utilise chez soi, et l'on réduit nettement les emballages jetables. Ma sœur prépare sa lessive depuis un an et n'achète plus un seul bidon de plastique.
D'un autre côté, je rejoins l'idée que "rassembler et préparer les ingrédients peut être fastidieux". Il faut du temps, de la place, et une certaine rigueur pour éviter les mauvaises proportions.
À mon avis, ces contraintes ne l'emportent pas sur les bénéfices, à condition de commencer par des recettes simples et de bien se documenter avant de se lancer.`;

test("the consigne pasted back is caught outright", () => {
  const share = copiedShare(CONSIGNE, CONSIGNE);
  assert.ok(share >= COPIED_HARD, `expected >= ${COPIED_HARD}, got ${share.toFixed(2)}`);
});

test("pasting most of it, minus the instruction line, is still caught", () => {
  // What a candidate actually does: select the documents, miss the last line.
  const partial = CONSIGNE.split("Deux points de vue")[0];
  const share = copiedShare(partial, CONSIGNE);
  assert.ok(share >= COPIED_HARD, `expected >= ${COPIED_HARD}, got ${share.toFixed(2)}`);
});

test("a real answer that quotes the documents is NOT caught", () => {
  // The cost of a false positive is refusing to grade work someone did, so
  // quoting — which an argumentative text is supposed to do — must stay clear
  // of both thresholds.
  const share = copiedShare(REAL_ANSWER, CONSIGNE);
  assert.ok(share < COPIED_WARN, `expected < ${COPIED_WARN}, got ${share.toFixed(2)}`);
});

test("an unrelated answer scores zero overlap", () => {
  assert.equal(copiedShare("Je pense que le sport est important pour la santé de tous les jeunes.", CONSIGNE), 0);
});

test("short or empty input never trips the check", () => {
  // Below the n-gram width there is nothing to compare; it must not divide by
  // zero or report a false match.
  assert.equal(copiedShare("Bonjour", CONSIGNE), 0);
  assert.equal(copiedShare("", CONSIGNE), 0);
  assert.equal(copiedShare(CONSIGNE, ""), 0);
  assert.equal(copiedShare(null, null), 0);
});
