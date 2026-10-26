import { groqChatJSON, normalizeFeedback } from "./groq.js";
import { eeSystem, eeUserMessage } from "./eeGrader.js";
import { copiedShare } from "./copiedPrompt.js";
import {
  EE_WRITER_RULES, EE_LEVEL_RULES, EE_DICTATION_RULES, EE_WORDS_LABEL,
  assembleAnswer, structureIssues, dictationIssues, applyCriteriaCaps,
} from "./eeSpec.js";

// THE model answer of one Expression écrite (subject, tâche): written once,
// checked, proofread, graded by our own grader, and only then stored. The same
// text is shown on the subject's « Modèle de réponse » page, as the « Exemple
// de réponse » in the writing workshop, and read aloud as the dictée — so it
// has to be a real exam answer at C1-C2 first, and dictable second.
//
// The pipeline, one Groq call per step:
//   write     — to the rules in eeSpec.js (the grader's requirements, the
//               guide's structure, the C1/C2 markers, the dictée constraints)
//   fix       — once, if code measured a problem (word range, a missing part,
//               a digit, a sentence too long to dictate, a copied synthesis)
//   proofread — every fault corrected by a separate reviewer pass
//   grade     — by the candidate grader itself (eeGrader.js), temperature 0
//   revise    — once, if the grade is under the bar, with the grader's own
//               remarks quoted back; then proofread and grade again
// A text that still fails after that is not published.
//
// WHY STEPS. Groq's free tier allows about 8 000 tokens a minute per model, and
// one careful write is most of that — a model answer takes two or three minutes
// of allowance, which no single 60 s serverless call can hold. So the state of
// a draft is a plain object, and `nextStep` advances it by exactly one call:
// the admin page drives it request by request and waits out each 429, while a
// local script can simply loop (see runModelAnswer).

// The bar. 16 is where the grader's C2 band starts; a model answer below it is
// one our own correction would mark C1 at best, and the candidate copying it
// should be shown the ceiling. Every criterion must be at least C1 (14) — a
// brilliant text with a C1 in orthographe still teaches someone a slip.
export const MODEL_PASS = { score: 16, criterion: 14 };

export const TASK_LABEL = {
  1: "Tâche 1 · Message",
  2: "Tâche 2 · Article, courrier ou note",
  3: "Tâche 3 · Comparer deux points de vue",
};

// The consigne as the grader and the generator both read it. Tâche 3's
// instruction is France Éducation international's own wording (sample paper
// EE00demo): two parts, the two opinions in the candidate's words, THEN their
// position — the same text the workshop shows the candidate.
export const T3_INSTRUCTION = "Vous écrivez un texte qui comprend deux parties : dans la première partie, vous présentez les deux opinions avec vos propres mots (entre 40 et 60 mots) ; dans la deuxième partie, vous donnez votre position sur le thème général, commun à ces deux opinions (entre 80 et 120 mots).";

export function consigneFor(task, sujet) {
  if (task === 1) return String(sujet?.t1 || "").trim();
  if (task === 2) return String(sujet?.t2 || "").trim();
  const t3 = sujet?.t3 || {};
  if (!t3.theme && !t3.doc1 && !t3.doc2) return "";
  return [t3.theme && `Thème : ${t3.theme}`, t3.doc1 && `Document 1 : ${t3.doc1}`, t3.doc2 && `Document 2 : ${t3.doc2}`, T3_INSTRUCTION]
    .filter(Boolean)
    .join("\n");
}

const SHAPE = {
  1: `{"plan":"<ton plan>","title":"","opening":"…","message":"<paragraphes séparés par \\n\\n>","closing":"…","signature":"…","keywords":["…"]}`,
  2: `{"plan":"<ton plan>","title":"<titre, ou \\"\\" pour un courrier ou une note>","body":"<trois paragraphes séparés par \\n\\n>","keywords":["…"]}`,
  3: `{"plan":"<ton plan>","title":"…","synthesis":"<un paragraphe>","opinion":"<deux paragraphes séparés par \\n\\n>","keywords":["…"]}`,
};

const writerSystem = (task) => `Tu es examinateur certifié du TCF Canada et tu rédiges le MODÈLE DE RÉPONSE officiel d'un sujet d'Expression écrite : le texte exact qu'un excellent candidat rendrait le jour de l'examen, et que nos candidats vont étudier, imiter et écrire sous la dictée.

${EE_WRITER_RULES[task]}

Règles absolues de la consigne :
- Traite TOUS les points de la consigne, dans l'ordre où elle les donne, et rien d'autre. Un texte hors sujet vaut zéro, si bien écrit soit-il.
- Respecte la fourchette de mots : hors fourchette, c'est une faute de consigne.
- Invente les détails concrets qui manquent (prénoms courants, jours, lieux) : un modèle doit être complet et vivant.

${EE_LEVEL_RULES}

${EE_DICTATION_RULES}

Commence par le champ "plan" (40 à 80 mots, non publié) : les points de la consigne dans l'ordre, ce que chaque paragraphe apporte, l'exemple concret qui l'illustre, et les deux ou trois tournures C1 que tu placeras là où elles sont justes. Puis rédige. Chaque phrase doit être juste, logique et naturelle — un texte qu'un francophone cultivé signerait. Relis-toi : orthographe, accords, ponctuation, et compte tes mots.

Fournis aussi 6 à 10 "keywords" : les expressions fortes à mémoriser, réutilisables dans N'IMPORTE quel sujet de la même tâche (articulateurs, formules d'ouverture et de clôture, tournures d'opinion, locutions soutenues). Rien de propre à ce sujet précis, pas de mot isolé banal. Chacune doit apparaître MOT POUR MOT dans ton texte.

Réponds UNIQUEMENT par un objet JSON, sans balisage dans les textes :
${SHAPE[task]}`;

const writeRequest = (task, consigne) =>
  `${TASK_LABEL[task]} — ${EE_WORDS_LABEL[task]}.\nConsigne réelle :\n${consigne}\n\nÉcris maintenant le modèle de réponse. Format JSON.`;

/* --------------------------------- checks --------------------------------- */

// A keyword is only worth storing if it really occurs in the body: the page
// highlights them by exact match, so a phrase the model "suggested" but never
// used would render as a dead entry in the « à mémoriser » list.
export function usableKeywords(list, body) {
  const hay = String(body || "").toLowerCase();
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const k = String(raw || "").trim().replace(/^[«"'\s]+|[»"'.,;:\s]+$/g, "");
    if (k.length < 3 || k.length > 80) continue;
    const low = k.toLowerCase();
    if (seen.has(low) || !hay.includes(low)) continue;
    seen.add(low);
    out.push(k);
    if (out.length >= 12) break;
  }
  return out;
}

// Everything code can measure. Tâche 3's synthesis is also checked for
// copying: the grader gives copied phrases no credit, and a model answer that
// lifts the documents teaches exactly the move that costs marks.
export function measuredIssues(task, answer, sujet) {
  // The title is checked on its own: it has no full stop, and joined to the
  // body it would read as the start of one very long first sentence.
  const out = [...structureIssues(task, answer), ...dictationIssues(answer.title), ...dictationIssues(answer.body)];
  if (task === 3) {
    const docs = [sujet?.t3?.doc1, sujet?.t3?.doc2].filter(Boolean).join(" ");
    if (docs && copiedShare(answer.parts.synthesis, docs) >= 0.2) {
      out.push("la synthèse reprend des passages entiers des documents : reformule-la entièrement avec tes propres mots");
    }
  }
  return out;
}

export const CRITERIA = ["consigne", "coherence", "lexique", "morphosyntaxe", "orthographe"];

export const passes = (grade) =>
  Boolean(grade) &&
  grade.score >= MODEL_PASS.score &&
  CRITERIA.every((k) => (grade.criteria?.[k] ?? 0) >= MODEL_PASS.criterion);

/* ---------------------------------- calls --------------------------------- */

// The writer and the proofreader run on the larger model with more thinking,
// and never fall back to the small one: a model answer is written once and
// studied by everyone, so it is worth waiting a minute for. The GRADE stays on
// the defaults — it must be the very call a candidate's text gets, or the bar
// would not be theirs.
//
// Thinking is kept LOW and the plan is asked for in the reply instead: at
// "medium" the reasoning regularly ran through the whole token allowance and
// left an empty reply (json_validate_failed), and the allowance cannot grow —
// Groq refuses any request whose prompt plus max_tokens exceeds the 8 000
// tokens a minute of the free tier. A written plan costs a few hundred tokens
// and cannot starve the answer.
const WRITER = { startWith: "openai/gpt-oss-120b", reasoningEffort: "low", maxTokens: 5000, fallback: false };

// gpt-oss sometimes spends its turn thinking and returns nothing, which Groq
// reports as json_validate_failed — seen twice in a row on the long writer
// prompt. Retried warmer, then with less thinking, which always answers.
const emptyReply = (err) => err?.upstreamStatus === 400 && /json_validate_failed/.test(err.upstreamDetail || "");

async function timed(meter, step, messages, opts) {
  const started = Date.now();
  const attempts = [opts, { ...opts, temperature: Math.min(1, (opts.temperature ?? 0.2) + 0.2) }, { ...opts, reasoningEffort: "low" }];
  let out;
  for (let i = 0; !out; i++) {
    try {
      out = await groqChatJSON(messages, attempts[i]);
    } catch (err) {
      if (!emptyReply(err) || i === attempts.length - 1) throw err;
    }
  }
  meter.push({ step, usage: out.usage, model: out.model, ms: Date.now() - started });
  return out.json || {};
}

function fromJson(task, json, sujet) {
  const answer = assembleAnswer(task, json || {});
  answer.keywords = usableKeywords(json?.keywords, answer.body);
  return { json, answer, issues: measuredIssues(task, answer, sujet) };
}

// The fields of a reply that hold prose, per tâche — what the proofreader is
// handed and must hand back.
const PROSE = { 1: ["opening", "message", "closing", "signature"], 2: ["title", "body"], 3: ["title", "synthesis", "opinion"] };

const PROOFREADER = `Tu es correcteur-réviseur dans une maison d'édition française. On te confie le modèle de réponse d'une épreuve de français (TCF Canada) qui sera publié et étudié par des milliers de candidats : il ne doit contenir AUCUNE faute.

Relis chaque phrase, mot par mot, et repère tout ce qui suit :
- orthographe et accents ; homophones (a/à, et/est, ses/ces, ou/où, -é/-er, leur/leurs) ;
- accords (sujet-verbe, participes passés, adjectifs, genre et nombre) ; conjugaison et concordance des temps ; mode (subjonctif après « bien que », « pour que », « il faut que »…) ;
- ponctuation : jamais de virgule entre le sujet et son verbe, virgules des incises, apostrophes ;
- articles, prépositions et constructions des verbes (« participer à », « se souvenir de ») ;
- LA LOGIQUE, phrase par phrase : chaque connecteur doit exprimer la relation réelle entre les deux idées qu'il relie — « en revanche » et « néanmoins » exigent une opposition, « donc » une conséquence, « dans la mesure où » une cause ou une restriction, « à condition que » une vraie condition. Un connecteur à contresens ou plaqué se remplace par le juste (ou se supprime). Une phrase dont le sens est flou, contradictoire ou absurde se reformule ;
- mots impropres, tournures calquées de l'anglais, phrases illogiques ou maladroites, incohérences de sens (un pronom qui renvoie à la mauvaise personne, un « chez-toi » qui devrait être « chez-moi ») ;
- registre (tu ou vous) constant d'un bout à l'autre.

Corrige chaque faute dans le texte, SANS rien changer d'autre : mêmes idées, même structure, même longueur à trois mots près. Garde les règles du texte : nombres en toutes lettres, ni chiffres, ni symboles, ni parenthèses, ni guillemets.

Réponds UNIQUEMENT par un objet JSON : {"errors":[{"wrong":"<forme fautive>","right":"<correction>"}],"fixed":{<les mêmes champs que le texte reçu, corrigés>}}. "errors" vaut [] si le texte est déjà parfait.`;

function revisionRequest(issues, g) {
  const lines = [];
  if (issues.length) lines.push("Problèmes mesurés dans ton texte :", ...issues.map((x) => `- ${x}`));
  if (g && !passes(g)) {
    const crit = Object.entries(g.criteria || {}).map(([k, v]) => `${k} ${v}/20`).join(", ");
    lines.push(`Le correcteur officiel lui donne ${g.score}/20 (${crit}). Il faut au moins ${MODEL_PASS.score}/20 et ${MODEL_PASS.criterion}/20 dans chaque critère.`);
    if (g.improvements?.length) lines.push("Ses remarques :", ...g.improvements.map((x) => `- ${x}`));
  }
  return `${lines.join("\n")}

Réécris le modèle de réponse en corrigeant TOUT cela, en gardant les mêmes idées et la même structure, et en respectant toujours chaque règle (fourchette de mots, parties obligatoires, niveau C1-C2, dictée). Renvoie le JSON complet, au même format. Écris maintenant. Format JSON.`;
}

// « cafés confortable » → « cafés confortables », as the grader quotes them.
// Only a real change of a few words: a quote that rewrites a whole sentence is
// advice, not a correction to splice in.
export function quotedFixes(improvements) {
  const out = [];
  for (const line of improvements || []) {
    for (const m of String(line).matchAll(/«\s*([^«»]{1,60}?)\s*»\s*(?:→|->|=>)\s*«\s*([^«»]{1,60}?)\s*»/g)) {
      const [wrong, right] = [m[1], m[2]];
      if (wrong !== right && wrong.split(/\s+/).length <= 5) out.push({ wrong, right });
    }
  }
  return out;
}

/* ---------------------------------- steps --------------------------------- */

// A draft: { task, json, answer, issues, corrections, grade, proofread, fixed,
// revised, best, done }. Plain data, so it can travel to the browser and back
// between two steps.
export const newDraft = (task) => ({ task, json: null, answer: null, issues: [], corrections: [], grade: null, proofread: false, fixes: 0, revised: false, best: null, done: false });

// Measured problems are fixed before anything else — up to twice, because a
// length miss is the usual one and a model told "remove 15 words" sometimes
// removes 5. After the grade, one more fix is allowed if only the measures fail.
const MAX_FIXES = 3;

// Ranks two candidates: passing beats failing, then fewer measured problems,
// then the higher grade.
const better = (a, b) => {
  if (!b) return a;
  if (passes(a.grade) !== passes(b.grade)) return passes(a.grade) ? a : b;
  if (a.issues.length !== b.issues.length) return a.issues.length < b.issues.length ? a : b;
  return (a.grade?.score ?? -1) >= (b.grade?.score ?? -1) ? a : b;
};

const snapshot = (d) => ({ json: d.json, answer: d.answer, issues: d.issues, corrections: d.corrections, grade: d.grade });

// What the next call will be, so the admin page can say it before it happens.
export function nextStepName(d) {
  if (d.done) return null;
  if (!d.json) return "write";
  if (d.issues.length && d.fixes < 2 && !d.proofread) return "fix";
  if (!d.proofread) return "proofread";
  if (!d.grade) return "grade";
  if (!passes(d.grade) && !d.revised) return "revise";
  // Graded well but still out of range: a last mechanical fix, then the
  // proofread and grade it needs again.
  if (d.issues.length && d.fixes < MAX_FIXES) return "fix";
  return null;
}

// Advances a draft by one Groq call. Throws whatever groqChatJSON throws — a
// 429 carries `retryAfterMs`, and the caller waits that long and calls again
// with the same draft.
export async function nextStep(draft, sujet) {
  const d = { ...draft };
  const task = d.task;
  const consigne = consigneFor(task, sujet);
  if (!consigne) throw new Error(`Tâche ${task} : aucune consigne.`);
  const meter = [];
  const base = [
    { role: "system", content: writerSystem(task) },
    { role: "user", content: writeRequest(task, consigne) },
  ];
  const step = nextStepName(d);

  if (step === "write") {
    Object.assign(d, fromJson(task, await timed(meter, step, base, { ...WRITER, temperature: 0.6 }), sujet));
  } else if (step === "fix" || step === "revise") {
    const msgs = [...base, { role: "assistant", content: JSON.stringify(d.json) }, { role: "user", content: revisionRequest(d.issues, step === "revise" ? d.grade : null) }];
    const next = fromJson(task, await timed(meter, step, msgs, { ...WRITER, temperature: 0.3 }), sujet);
    if (step === "fix") {
      const afterGrade = Boolean(d.grade);
      d.fixes += 1;
      if (next.issues.length <= d.issues.length) {
        // A fix after the grade changes the graded text, so it is proofread
        // and graded again — the published grade is always of the published text.
        Object.assign(d, next, afterGrade ? { best: snapshot(d), corrections: [], grade: null, proofread: false } : {});
      }
    } else {
      // The graded text is kept aside; the revision has to be proofread and
      // graded in its own right before it can replace it.
      d.revised = true;
      d.best = snapshot(d);
      Object.assign(d, next, { corrections: [], grade: null, proofread: false });
    }
  } else if (step === "proofread") {
    const fields = Object.fromEntries(PROSE[task].map((k) => [k, d.json?.[k] ?? ""]));
    const json = await timed(meter, step, [
      { role: "system", content: PROOFREADER },
      { role: "user", content: `Texte à relire (JSON) :\n${JSON.stringify(fields)}\n\nRelis-le maintenant. Format JSON.` },
    ], { ...WRITER, reasoningEffort: "high", temperature: 0 });
    d.proofread = true;
    const errors = Array.isArray(json.errors) ? json.errors.filter((e) => e && e.wrong && e.right && e.wrong !== e.right) : [];
    const fixed = json.fixed && typeof json.fixed === "object" ? json.fixed : null;
    // Applied only when it kept every part (a correction must never cost a
    // part of the text) and broke no rule the original kept.
    const keepsAll = fixed && PROSE[task].every((k) => !String(d.json?.[k] || "").trim() || String(fixed[k] || "").trim());
    if (errors.length && keepsAll) {
      const next = fromJson(task, { ...d.json, ...Object.fromEntries(PROSE[task].map((k) => [k, fixed[k]])) }, sujet);
      if (next.issues.length <= d.issues.length) Object.assign(d, next, { corrections: errors });
    }
  } else if (step === "grade") {
    const text = [d.answer.title, d.answer.body].filter(Boolean).join("\n\n");
    const json = await timed(meter, step, [
      { role: "system", content: eeSystem("fr", task) },
      { role: "user", content: eeUserMessage({ taskLabel: TASK_LABEL[task], prompt: consigne, targetWords: EE_WORDS_LABEL[task], wordCount: d.answer.words, text }) },
    ], { temperature: 0 });
    const fb = applyCriteriaCaps(normalizeFeedback(json, text), json);
    d.grade = { score: fb.score, criteria: fb.criteria, summary: fb.summary, improvements: fb.improvements };
    // The grader is told to quote every slip as « wrong » → « right ». A slip
    // it quotes is one our own correction would show the candidate, so it is
    // fixed in the published text — only where the wrong form is really there.
    const quoted = quotedFixes(fb.improvements);
    if (quoted.length) {
      const json2 = { ...d.json };
      let applied = [];
      for (const k of PROSE[task]) {
        let v = String(json2[k] || "");
        for (const f of quoted) if (v.includes(f.wrong)) { v = v.split(f.wrong).join(f.right); applied.push(f); }
        json2[k] = v;
      }
      applied = [...new Map(applied.map((f) => [f.wrong, f])).values()];
      const next = applied.length ? fromJson(task, json2, sujet) : null;
      if (next && next.issues.length <= d.issues.length) Object.assign(d, next, { corrections: [...d.corrections, ...applied] });
    }
    if (d.best) {
      Object.assign(d, better(snapshot(d), d.best));
      d.best = null;
    }
  }

  d.done = nextStepName(d) === null;
  return { draft: d, step, meter, passed: d.done && passes(d.grade) && d.issues.length === 0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The whole pipeline in one go, waiting out Groq's per-minute limits — for
// scripts and tests, where there is no 60 s cap.
export async function runModelAnswer(task, sujet, { onStep } = {}) {
  let draft = newDraft(task);
  const meter = [];
  for (;;) {
    try {
      const r = await nextStep(draft, sujet);
      draft = r.draft;
      meter.push(...r.meter);
      onStep?.(r);
      if (draft.done) return { ...r, meter };
    } catch (err) {
      if (err.status !== 429 && err.upstreamStatus !== 429) throw err;
      await sleep(Math.min(Math.max(err.retryAfterMs || 20_000, 3_000), 65_000));
    }
  }
}
