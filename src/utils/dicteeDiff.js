// The dictée's correction engine: aligns what the candidate typed against the
// text they heard, word by word, and says WHY each word was missed.
//
// Pure — no imports, no React, no network — so `node --test` can hold it to a
// fixture table (tests/dictee-diff.test.mjs) and the same module can run in the
// browser during a live session.
//
// Two comparison keys, and the difference between them is the whole point.
// `base` strips accents, so "developpement" and "développement" align as the
// SAME word: the candidate heard it correctly and misspelt it. `exact` keeps
// accents, so the pair is then reported as an accent error rather than a miss.
// Collapsing the two — treating a missing accent as a wrong word — would tell
// someone their listening is bad when their listening was fine, and that is
// precisely the wrong instruction to give before a TCF.
//
// Punctuation, capitals and apostrophe style are NOT scored. A dictée is a
// listening and spelling exercise; deducting for a comma the candidate could
// not hear measures typing habits, not French.

/* -------------------------------- tokens --------------------------------- */

// A token is a run of letters/digits with an optional trailing apostrophe, so
// elision splits the way it is heard: "l'homme" → ["l'", "homme"]. Hyphens are
// separators, which makes "peut-être" and "peut être" align instead of
// cascading into a substitution plus an insertion over a hyphen nobody spoke.
const TOKEN_RE = /[\p{L}\p{N}]+['’]?/gu;

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Accents kept, apostrophes and case dropped: "C'est" → "cest", "été" → "été".
const exactKey = (s) => s.toLowerCase().replace(/['’]/g, "");
// Accents dropped too: "été" → "ete". This is what alignment matches on.
const baseKey = (s) => stripAccents(exactKey(s));

const hasAccent = (s) => stripAccents(s) !== s;

// Keeps each token's offsets so the report can rebuild the original sentence —
// punctuation, spacing and hyphens intact — with only the words highlighted.
export function tokenize(text) {
  const out = [];
  for (const m of String(text || "").matchAll(TOKEN_RE)) {
    out.push({ raw: m[0], start: m.index, end: m.index + m[0].length, base: baseKey(m[0]), exact: exactKey(m[0]) });
  }
  return out;
}

/* ------------------------------- alignment ------------------------------- */

// Levenshtein over token arrays with a backtrace. Substitution and indel cost
// the same (1), so the table prefers ONE substitution over a delete plus an
// insert — a candidate who writes the wrong word is shown "you wrote X, it was
// Y" rather than "you missed Y" and "you invented X", which reads as two
// mistakes for one slip.
function align(expected, typed) {
  const n = expected.length;
  const m = typed.length;
  const d = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = expected[i - 1].base === typed[j - 1].base;
      d[i][j] = Math.min(
        d[i - 1][j - 1] + (same ? 0 : 1),
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
      );
    }
  }
  // Walk back from the corner. Diagonal first so equal-cost paths resolve to a
  // substitution rather than an indel pair.
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = expected[i - 1].base === typed[j - 1].base;
      if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) {
        ops.push({ kind: same ? "match" : "sub", exp: expected[i - 1], got: typed[j - 1] });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ kind: "del", exp: expected[i - 1], got: null });
      i--;
      continue;
    }
    ops.push({ kind: "ins", exp: null, got: typed[j - 1] });
    j--;
  }
  return ops.reverse();
}

/* ---------------------------- error families ----------------------------- */

// Grouped by what a candidate has to LEARN, not by what the string looks like.
// Each family points at a different remedy, which is why "accent" and
// "homophone" are separate even though "a"/"à" is both.
export const ERROR_FAMILIES = {
  homophone: { label: "Homophones grammaticaux", hint: "Des mots qui se prononcent pareil et s'écrivent autrement : c'est la grammaire, pas l'oreille, qui tranche." },
  ending: { label: "Terminaisons -é / -er / -ez", hint: "Infinitif, participe passé ou 2ᵉ personne : même son, trois orthographes." },
  plural: { label: "Accords (pluriel, féminin)", hint: "Les marques d'accord sont muettes à l'oral — il faut les déduire de la phrase." },
  accent: { label: "Accents", hint: "Le mot est bien entendu, l'accent manque ou se trompe de sens." },
  function: { label: "Petits mots oubliés", hint: "Articles, prépositions et pronoms sont peu accentués à l'oral : c'est ce qui saute en premier." },
  spelling: { label: "Orthographe", hint: "Le mot est reconnu mais mal écrit." },
  missed: { label: "Mots non entendus", hint: "Un mot manquant ou remplacé par un autre : là, c'est bien la compréhension orale." },
  extra: { label: "Mots ajoutés", hint: "Un mot écrit qui n'était pas dans le texte — souvent une coupure de mots mal placée." },
};

// Words that sound alike and are chosen by grammar. Written apostrophe-free
// and lowercase, exactly as `exactKey` produces them, so "c'est" is "cest".
const HOMOPHONE_GROUPS = [
  ["a", "à"],
  ["ou", "où"],
  ["ce", "se"],
  ["ces", "ses", "cest", "sest", "sais", "sait"],
  ["son", "sont"],
  ["on", "ont"],
  ["et", "est", "es"],
  ["la", "là", "las"],
  ["du", "dû"],
  ["sur", "sûr"],
  ["mes", "mais", "mets", "met", "mest"],
  ["peu", "peut", "peux"],
  ["ni", "ny"],
  ["si", "sy"],
  ["quand", "quant", "quen"],
  ["leur", "leurs"],
  ["quel", "quels", "quelle", "quelles"],
  ["tout", "tous"],
  ["notre", "nôtre"],
  ["votre", "vôtre"],
  ["cest", "sest", "ses", "ces"],
];

const HOMOPHONE_OF = new Map();
for (const group of HOMOPHONE_GROUPS) {
  for (const w of group) {
    if (!HOMOPHONE_OF.has(w)) HOMOPHONE_OF.set(w, new Set());
    for (const other of group) if (other !== w) HOMOPHONE_OF.get(w).add(other);
  }
}

const isHomophonePair = (a, b) => !!HOMOPHONE_OF.get(a)?.has(b);

// Unstressed grammar words. Missing one of these is a listening artefact, not
// a vocabulary gap, and it earns a different piece of advice.
const FUNCTION_WORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "a", "à",
  "en", "y", "et", "ou", "où", "ne", "n", "pas", "plus", "que", "qu", "qui", "quoi",
  "ce", "cet", "cette", "ces", "se", "s", "son", "sa", "ses", "leur", "leurs",
  "mon", "ma", "mes", "ton", "ta", "tes", "notre", "nos", "votre", "vos",
  "il", "elle", "ils", "elles", "on", "nous", "vous", "je", "j", "tu", "me", "m", "te", "t",
  "est", "sont", "ont", "par", "pour", "dans", "sur",
  "avec", "sans", "sous", "chez", "vers", "dès", "car", "mais", "donc", "si",
]);

// Endings that share a sound in modern French — the -é/-er/-ez family, plus the
// imperfect forms that collapse onto it. Longest first: the stripper takes the
// first match, and "aient" must win over "e".
const VERB_ENDINGS = ["eraient", "aient", "erent", "erai", "eras", "erez", "ais", "ait", "ees", "er", "ez", "es", "ee", "ai", "e"];

function splitEnding(base) {
  for (const end of VERB_ENDINGS) {
    if (base.length > end.length && base.endsWith(end)) return [base.slice(0, -end.length), end];
  }
  return [base, ""];
}

// True when one base is the other plus a silent agreement mark. Covers the
// plural -s/-x, the feminine -e and the verbal -nt, in either direction.
function isAgreementPair(a, b) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!long.startsWith(short)) return false;
  const tail = long.slice(short.length);
  return tail === "s" || tail === "x" || tail === "e" || tail === "es" || tail === "nt" || tail === "ent";
}

function levenshtein(a, b) {
  const m = b.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[m];
}

// Order matters and encodes a teaching priority. A homophone is checked before
// an accent because "a" vs "à" is a grammar rule, not a typing slip, and the
// candidate needs the rule. An agreement mark is checked before a verb ending
// so "parle"/"parles" reads as an agreement error rather than an -é/-er one.
function classify(expWord, gotWord) {
  if (gotWord === null) return FUNCTION_WORDS.has(expWord.exact) ? "function" : "missed";
  if (isHomophonePair(expWord.exact, gotWord.exact)) return "homophone";
  if (expWord.base === gotWord.base) return "accent";
  if (isAgreementPair(expWord.base, gotWord.base)) return "plural";
  const [expStem, expEnd] = splitEnding(expWord.base);
  const [gotStem, gotEnd] = splitEnding(gotWord.base);
  if (expStem && expStem === gotStem && expEnd && gotEnd && expEnd !== gotEnd) return "ending";
  if (levenshtein(expWord.base, gotWord.base) <= 2) return "spelling";
  return "missed";
}

/* -------------------------------- the diff ------------------------------- */

// Compares one sentence. Returns the rendered diff plus the counters the report
// and the stored session are built from.
//
// `parts` is the EXPECTED sentence rebuilt from its own source string — every
// gap between two tokens (spaces, commas, hyphens) is emitted verbatim — so the
// correction the candidate reads is the real text, with only the words carrying
// a verdict.
export function diffSentence(expectedText, typedText) {
  const expected = tokenize(expectedText);
  const typed = tokenize(typedText);
  const ops = align(expected, typed);

  const words = [];
  const extras = [];
  const errors = {};
  const bump = (family) => { errors[family] = (errors[family] || 0) + 1; };

  for (const op of ops) {
    if (op.kind === "ins") {
      extras.push(op.got.raw);
      bump("extra");
      continue;
    }
    if (op.kind === "match" && op.exp.exact === op.got.exact) {
      words.push({ status: "ok", exp: op.exp, got: op.got.raw });
      continue;
    }
    // A "match" whose exact keys differ is the accent case: same word, wrong
    // spelling. Everything else is a substitution or a deletion.
    const family = classify(op.exp, op.got);
    words.push({
      status: family === "accent" ? "accent" : op.got ? "wrong" : "missing",
      exp: op.exp,
      got: op.got ? op.got.raw : null,
      family,
    });
    bump(family);
  }

  const total = expected.length;
  const ok = words.filter((w) => w.status === "ok").length;
  const heard = words.filter((w) => w.status === "ok" || w.status === "accent").length;
  // Counted over the accented words the candidate actually reproduced, not by
  // subtracting accent errors from the total: a word that was missed outright
  // was never a chance to get its accent right, and crediting it would make the
  // accent figure climb as the score falls.
  const accentTotal = expected.filter((t) => hasAccent(t.raw)).length;
  const accentOk = words.filter((w) => w.status === "ok" && hasAccent(w.exp.raw)).length;

  return {
    source: expectedText,
    typed: typedText,
    words,
    extras,
    errors,
    total,
    ok,
    heard,
    accentTotal,
    accentOk,
    perfect: ok === total && extras.length === 0,
  };
}

// Rolls the per-sentence diffs into the numbers the report headline shows and
// the row written to dictee_sessions.
export function summarize(diffs) {
  const sum = (key) => diffs.reduce((s, d) => s + d[key], 0);
  const total = sum("total");
  const ok = sum("ok");
  const heard = sum("heard");
  const accentTotal = sum("accentTotal");
  const accentOk = sum("accentOk");
  const errors = {};
  for (const d of diffs) {
    for (const [family, n] of Object.entries(d.errors)) errors[family] = (errors[family] || 0) + n;
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);
  return {
    words: total,
    correct: ok,
    heard,
    // The headline. Accents count, as they do for a grader reading the text.
    score: pct(ok, total),
    // "You heard it right, you spelt it wrong" — always ≥ score, and the gap
    // between the two is the single most useful number in the report.
    heardPct: pct(heard, total),
    accentTotal,
    accentOk,
    accentPct: pct(accentOk, accentTotal),
    accentErrors: errors.accent || 0,
    errors,
    // Families ranked by count, so the report can lead with the one worth
    // fixing first instead of listing all eight.
    ranked: Object.entries(errors)
      .filter(([family]) => ERROR_FAMILIES[family])
      .sort((a, b) => b[1] - a[1])
      .map(([family, count]) => ({ family, count, ...ERROR_FAMILIES[family] })),
  };
}
