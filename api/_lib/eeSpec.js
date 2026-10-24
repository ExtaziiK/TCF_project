// The Expression écrite rules, in ONE place.
//
// Three things read them and they must never disagree: the grader that marks a
// candidate's text (api/expression-ecrite.js), the generator that writes the
// model answer for every subject (api/_lib/eeModelAnswer.js), and the dictée,
// which is that same model answer read aloud. A model answer written to rules
// the grader does not apply teaches the wrong thing; a grader judging rules the
// model answers break makes our own corrigé look like a fail. Kept in step with
// the method the candidate reads in src/constants/guideEE.js (EE_METHOD).

// The official word ranges, and where a model answer aims inside them: high
// enough to show a developed text, far enough from the ceiling that nobody who
// copies the structure overshoots.
export const EE_RANGE = { 1: [60, 120], 2: [120, 150], 3: [120, 180] };
export const EE_TARGET = { 1: 95, 2: 135, 3: 160 };
// Where the writer is told to land. The model cannot count its own words, and
// overshoots far more often than it falls short, so it aims well inside the
// range; the check that matters is still the official range above.
export const EE_AIM = { 1: [80, 105], 2: [125, 145], 3: [145, 172] };
export const EE_WORDS_LABEL = { 1: "60 à 120 mots", 2: "120 à 150 mots", 3: "120 à 180 mots" };

// Tâche 3's two parts, as the guide teaches them.
export const T3_SYNTHESIS = [40, 60];
export const T3_OPINION = [80, 120];

// Words as the exam's on-screen counter counts them: runs of non-space
// characters. The grader is handed this number, so the generator must measure
// with the same ruler — two counters a few words apart near a limit is how a
// "model" ends up out of range.
export const examWords = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/* ------------------------------- the grader ------------------------------- */

// What each tâche requires, as the grader checks it under "Consigne".
// Tâche 3's two parts are the classic miss — an opinion with no synthesis of
// the two documents — and nothing caught it while the grader only knew the
// label.
export const EE_TASK_BRIEFS = {
  1: `THIS TÂCHE — Tâche 1, a MESSAGE (60-120 words) to the recipient named in the consigne, to describe, narrate or explain. Under Consigne, check: every point the consigne asks for is covered; the register fits the recipient (« tu » for a friend or relative, « vous » for a superior, a stranger or an institution) and stays consistent; it reads as a message — an opening, the purpose stated early, a closing formula. A requested point left out is a real consigne penalty; a missing greeting alone is minor.`,
  2: `THIS TÂCHE — Tâche 2, an ARTICLE, LETTER, BLOG POST or NOTE (120-150 words) for several readers: the account of an experience or event AND the writer's impressions or opinion. Under Consigne, check: both are there — the account (narrated, usually in the past: passé composé for events, imparfait for background, used correctly) and the opinion; it suits the publication named (a title is welcome for an article or blog post); it is organised in paragraphs. An account with no opinion, or an opinion with no account, carries out only half of the task.`,
  3: `THIS TÂCHE — Tâche 3, COMPARING TWO POINTS OF VIEW (120-180 words) given in two short documents. It has TWO REQUIRED PARTS: (1) a SYNTHESIS that restates the position of BOTH documents, neutrally and in the candidate's own words (about 40-60 words); (2) the candidate's OWN OPINION, clearly stated and argued with reasons and examples (about 80-120 words). Under Consigne, check: both parts are present; the synthesis covers both documents, not one; it is reformulated, not copied (copied phrases earn no lexique or morphosyntaxe credit); the opinion is argued, not just announced. A text with no synthesis (only an opinion), or whose synthesis covers one document only, misses a required part: Consigne at 8 or below and the OVERALL score at most 11, whatever the quality of the language — and say in an improvement which part is missing.`,
};

/* ------------------------------ the generator ----------------------------- */

// The same requirements, said to the writer of the model answer — plus the
// structure the guide teaches, since a model answer is also a template the
// candidate will reuse on exam day. Each line here answers one line of the
// grader brief above.
export const EE_WRITER_RULES = {
  1: `TÂCHE 1 — un MESSAGE (courriel, mot) adressé au destinataire de la consigne. ${EE_WORDS_LABEL[1]} : écris entre ${EE_AIM[1][0]} et ${EE_AIM[1][1]} mots, jamais plus.
Structure obligatoire, dans cet ordre :
- "opening" : la formule d'appel, adaptée au destinataire (« Salut Karim, », « Chère Madame Dubois, », « Madame, Monsieur, »).
- "message" : 2 ou 3 paragraphes. Le premier annonce D'EMBLÉE pourquoi tu écris. Puis tous les détails que la consigne demande (qui, quoi, quand, où, comment, pourquoi), un par un, sans en oublier ni en inventer d'autres. Puis les attentes concrètes ou l'invitation à répondre.
- "closing" : la formule de congé, adaptée au registre (« À très vite, », « Bien à vous, », « Je vous prie d'agréer, Madame, mes salutations distinguées. »).
- "signature" : un prénom courant.
Registre : « tu » pour un ami ou un proche, « vous » pour un supérieur, un inconnu ou une institution — et le même du début à la fin.
Un message ne porte pas de titre : "title" vaut "".`,
  2: `TÂCHE 2 — un ARTICLE, BILLET DE BLOG, COURRIER ou NOTE destiné à plusieurs lecteurs. ${EE_WORDS_LABEL[2]} : écris entre ${EE_AIM[2][0]} et ${EE_AIM[2][1]} mots, titre compris, jamais plus.
Deux éléments sont OBLIGATOIRES, sinon la tâche n'est faite qu'à moitié :
1) le RÉCIT de l'expérience ou de l'événement, raconté au passé : passé composé pour les faits, imparfait pour le décor et les sentiments, plus-que-parfait si un fait précède l'autre ;
2) les IMPRESSIONS et l'OPINION de l'auteur, argumentées, avec une recommandation ou une invitation adressée aux lecteurs.
Structure : "title" = un titre accrocheur pour un article ou un billet de blog ("" pour un courrier ou une note) ; "body" = 3 paragraphes : présentation succincte et attirante du sujet, récit au passé avec des détails concrets, impressions et recommandation. Pour un courrier, ouvre et ferme le corps par une formule d'appel et de congé.
Registre courant soutenu, adressé à des lecteurs, pas à un ami.`,
  3: `TÂCHE 3 — COMPARER DEUX POINTS DE VUE puis donner le sien. ${EE_WORDS_LABEL[3]} : écris entre ${EE_AIM[3][0]} et ${EE_AIM[3][1]} mots, titre compris, jamais plus.
Deux parties OBLIGATOIRES, rédigées séparément :
- "synthesis" (${T3_SYNTHESIS[0]} à ${T3_SYNTHESIS[1]} mots, un seul paragraphe) : présente le débat en une phrase, puis la position du document 1 ET celle du document 2, de façon NEUTRE (aucun avis personnel ici), reliées par un connecteur d'opposition (« en revanche », « à l'inverse », « tandis que »). REFORMULE avec tes propres mots : ne recopie aucune suite de plus de trois mots des documents.
- "opinion" (${T3_OPINION[0]} à ${T3_OPINION[1]} mots, deux paragraphes) : ta position annoncée clairement, défendue par au moins DEUX arguments distincts dont l'un est illustré par un exemple concret, puis une conclusion NUANCÉE qui pèse les deux côtés ou pose une condition (pas une opinion plate).
"title" = un titre court pour le texte (journal, site, blog) — il n'est pas compté dans les deux parties.
Registre formel, connecteurs logiques explicites.`,
};

// The C1/C2 markers the grader looks for (its 14-15 and 16-20 bands), said as
// instructions. A model answer that lacks one of them is marked B2 by our own
// grader, and the candidate who copies it learns B2.
export const EE_LEVEL_RULES = `NIVEAU VISÉ : C1-C2, c'est-à-dire 16 à 20 sur 20 avec la grille officielle. Le correcteur cherche précisément ceci, et tout doit y être :
- des connecteurs AU-DELÀ de la série de base (pas seulement « d'abord, ensuite, mais, parce que »), par exemple « en revanche », « certes… néanmoins », « dans la mesure où », « à condition que », « force est de constater que », « en définitive » — chacun employé dans son sens EXACT, là où le raisonnement l'appelle. Un connecteur plaqué ou employé à contresens est une faute de cohérence, pas un atout : mieux vaut trois connecteurs justes que six forcés ;
- de la subordination réelle et variée (relatives avec « dont », « où », « lequel » ; concessives ; causales ; participiales) ;
- au moins un conditionnel ET au moins un subjonctif, là où le sens les demande vraiment ;
- un lexique précis et idiomatique, sans répétition, sans mot vague (« chose », « faire », « il y a », « bien », « beaucoup ») ;
- un registre tenu avec aisance du premier au dernier mot ;
- une orthographe parfaite : accents, accords du participe, a/à, et/est, ses/ces, -é/-er, ponctuation. Aucune faute, même subtile.
Avant tout, chaque phrase doit être LOGIQUE et dire quelque chose de précis : des faits concrets, des exemples, une progression d'idées. Le texte reste celui d'un CANDIDAT le jour de l'examen : naturel, vivant, crédible — pas un essai de professeur, pas de vocabulaire rare pour le plaisir.`;

// The model answer is also the text of the dictée: read aloud group by group
// and typed by a candidate. These rules make it dictable without making it a
// worse exam answer — none of them costs a mark at the real épreuve.
export const EE_DICTATION_RULES = `Ce texte sera aussi DICTÉ (lu à voix haute et écrit par un candidat). Donc :
- phrases de 8 à 25 mots, jamais plus de 25 ;
- nombres en toutes lettres (« vingt pour cent », « deux mille vingt-six »), aucun chiffre ;
- aucun symbole (%, €, $, &, /, #, +), aucune abréviation, aucun sigle, aucune adresse ;
- ni parenthèses, ni guillemets, ni tirets de liste, ni listes ;
- seulement des prénoms et noms propres courants et faciles à écrire.`;

/* ---------------------------- deterministic checks ------------------------ */

// What can be verified without a model, so the gate never spends a grading
// call on a text that is out of range or cannot be dictated. Each problem is a
// sentence the generator is shown verbatim when it is asked to fix its text.

const SENTENCE_MAX = 25;

const sentencesIn = (text) =>
  (String(text || "").replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]+(?:\s*[»"])?|\S[^.!?…]*$/g) || []).map((s) => s.trim()).filter(Boolean);

export function dictationIssues(text) {
  const out = [];
  const t = String(text || "");
  if (/\d/.test(t)) out.push("il contient des chiffres : écris tous les nombres en toutes lettres");
  if (/[%€$&/#+=@]/.test(t)) out.push("il contient des symboles (%, €, /…) : écris-les en mots");
  if (/[()[\]«»"“”]/.test(t)) out.push("il contient des parenthèses ou des guillemets : supprime-les");
  if (/(^|\n)\s*[-•*]\s/.test(t)) out.push("il contient une liste à tirets : rédige en prose");
  const long = sentencesIn(t).filter((s) => examWords(s) > SENTENCE_MAX);
  if (long.length) out.push(`${long.length} phrase(s) dépassent ${SENTENCE_MAX} mots (par exemple « ${long[0].split(/\s+/).slice(0, 8).join(" ")}… ») : coupe-les`);
  return out;
}

// Structure and length, per tâche. `a` is the assembled answer
// ({ title, body, parts }) built by assembleAnswer below.
export function structureIssues(task, a) {
  const out = [];
  const [lo, hi] = EE_RANGE[task];
  const words = a.words;
  if (words < lo || words > hi) {
    const [a, b] = EE_AIM[task];
    out.push(words > hi
      ? `le texte fait ${words} mots alors que le maximum est ${hi} : supprime environ ${words - EE_TARGET[task]} mots (phrases secondaires, adjectifs superflus) pour revenir entre ${a} et ${b}`
      : `le texte fait ${words} mots alors que le minimum est ${lo} : ajoute environ ${EE_TARGET[task] - words} mots (un détail concret, un exemple) pour arriver entre ${a} et ${b}`);
  }
  if (task === 1) {
    if (!a.parts.opening) out.push("la formule d'appel manque");
    if (!a.parts.closing) out.push("la formule de congé manque");
    if (!a.parts.signature) out.push("la signature manque");
  }
  if (task === 2) {
    const paras = a.parts.body.split(/\n{2,}/).filter((p) => p.trim()).length;
    if (paras < 3) out.push(`le texte n'a que ${paras} paragraphe(s) : il en faut trois (présentation, récit au passé, impressions et recommandation)`);
  }
  if (task === 3) {
    const s = examWords(a.parts.synthesis);
    const o = examWords(a.parts.opinion);
    if (!s) out.push("la synthèse des deux documents manque");
    else if (s < T3_SYNTHESIS[0] - 5 || s > T3_SYNTHESIS[1] + 5) out.push(`la synthèse fait ${s} mots : il en faut ${T3_SYNTHESIS[0]} à ${T3_SYNTHESIS[1]}`);
    if (!o) out.push("l'opinion argumentée manque");
    else if (o < T3_OPINION[0] - 5 || o > T3_OPINION[1] + 5) out.push(`l'opinion fait ${o} mots : il en faut ${T3_OPINION[0]} à ${T3_OPINION[1]}`);
  }
  return out;
}

/* ------------------------------- assembling ------------------------------- */

const clean = (s) =>
  String(s || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// One generator reply → the stored answer. The parts are kept so the checks
// above can measure each of them, and so the page can show the structure; the
// body is what a candidate would type in the exam box, title excluded.
export function assembleAnswer(task, raw = {}) {
  const title = clean(raw.title).replace(/^#+\s*/, "").replace(/[.:]+$/, "");
  let parts;
  let body;
  if (task === 1) {
    parts = { opening: clean(raw.opening), message: clean(raw.message), closing: clean(raw.closing), signature: clean(raw.signature) };
    body = [parts.opening, parts.message, parts.closing, parts.signature].filter(Boolean).join("\n\n");
  } else if (task === 3) {
    parts = { synthesis: clean(raw.synthesis).replace(/\n+/g, " "), opinion: clean(raw.opinion) };
    body = [parts.synthesis, parts.opinion].filter(Boolean).join("\n\n");
  } else {
    parts = { body: clean(raw.body) };
    body = parts.body;
  }
  // The title is typed into the exam box too, so it counts.
  const words = examWords(body) + examWords(title);
  return { task, title: task === 1 ? "" : title, body, parts, words };
}

/* -------------------------------- the dictée ------------------------------ */

// The dictée reads the model answer as one block of prose. Only what a teacher
// would actually dictate is kept: the title and the signature are left out, and
// a formula of address ending in a comma runs on into the sentence it opens —
// "Salut Karim, j'espère…" — the way it is read aloud, with the next word
// lowercased unless it is a name.
export function dictationText(answer) {
  const paras = String(answer?.body || "").split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  // The signature: named by the parts when they are known, otherwise — a
  // stored answer is only its body — a last line of one to three words with no
  // full stop, which is what a signature looks like and no sentence does.
  const last = paras[paras.length - 1] || "";
  const signature = answer?.parts?.signature
    ? last === answer.parts.signature
    : examWords(last) <= 3 && !/[.!?…,]$/.test(last);
  if (Number(answer?.task) === 1 && paras.length > 1 && signature) paras.pop();
  // A word written with a capital in the middle of a sentence is a name.
  const names = new Set((paras.join(" ").match(/(?<=\p{Ll} )\p{Lu}[\p{L}'’-]*/gu) || []).map((w) => w.toLowerCase()));
  let text = "";
  for (const p of paras) {
    if (!text) { text = p; continue; }
    if (/,$/.test(text)) {
      const first = p.match(/^[\p{L}'’-]+/u)?.[0] || "";
      const isName = names.has(first.toLowerCase()) && !/^(je|j['’]|nous|vous|tu|il|elle|on|c['’]|ce|cette|le|la|les|l['’])$/i.test(first);
      text += ` ${isName ? p : p.charAt(0).toLowerCase() + p.slice(1)}`;
    } else {
      text += ` ${p}`;
    }
  }
  text = text.trim();
  // A closing formula left as the last words ("Bien à vous,") ends the text.
  if (text && !/[.!?…]$/.test(text)) text = text.replace(/[,;:\s]+$/, "") + ".";
  return text;
}
