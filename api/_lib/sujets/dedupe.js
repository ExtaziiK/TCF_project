import { groqChatJSON } from "../groq.js";
import { logAiUsage } from "../usage.js";

// Cross-source duplicate detection.
//
// The two sources report the SAME real exam, transcribed by different
// candidates. So the same combinaison shows up on both sites in different
// words, and the fingerprint that catches a re-run of one source (an exact hash
// of its text — see sujetsSource.js) cannot see across sources at all.
//
// Nor can text similarity. Measured on Août 2026, three pairs that are provably
// the same combinaison — "Votre amie Anna prévoit de passer un week-end dans
// votre ville…" vs "Je suis votre amie Anna et je compte passer un weekend dans
// ta ville…" — score 0.31, 0.46 and 0.57 on content-word overlap, while
// genuinely different EO sujets reach 0.41 on shared boilerplate alone. The
// ranges overlap, so no threshold separates them.
//
// Recognising them is a judgement about meaning, so the model makes it. It is
// asked only to match candidates against subjects we already have — never to
// rewrite or invent — and its answer can only ever SKIP an import. When it is
// unavailable or unparseable, nothing is skipped: a duplicate that slips
// through is visible in the review panel and one click to delete, whereas a
// wrongly skipped subject is silently lost.

const SYSTEM = `Tu compares des sujets d'examen TCF Canada.

On te donne des sujets DÉJÀ enregistrés (liste "connus") et des sujets CANDIDATS provenant d'un autre site. Les deux sites rapportent les mêmes examens réels, transcrits par des candidats différents : un même sujet peut donc être formulé très différemment.

Pour chaque candidat, dis s'il correspond à un sujet déjà connu. Applique ces deux règles dans l'ordre.

1) MÊME sujet — la situation décrite est la même : mêmes personnages, mêmes circonstances, même chose à produire. La formulation, l'ordre des informations et le niveau de détail peuvent être complètement différents, et les prénoms ou lieux cités sont un indice fort.
   « Votre amie Anna prévoit de passer un week-end dans votre ville et souhaite connaître les moyens de transport disponibles » = « Je suis votre amie Anna et je compte passer un weekend dans ta ville. Donnez-moi des informations sur les moyens de transport » → MÊME sujet.
   « Vous avez invité votre ami Cédric à votre mariage au Château de Chombony, il ignore où il se trouve » = « Vous avez invité Cédric à votre mariage au Château de Chombony et il ne connaît pas ce château » → MÊME sujet.

2) Sujets DIFFÉRENTS — il n'y a qu'un thème en commun, mais la question posée ou la tâche demandée n'est pas la même. C'est fréquent pour les questions d'opinion courtes : un même thème revient de session en session avec une question différente.
   « Les animaux de compagnie peuvent-ils rendre les personnes plus heureuses ? » ≠ « Pourquoi certaines personnes choisissent-elles d'avoir un animal domestique ? » → DIFFÉRENTS.
   Un sujet qui demande de raconter une expérience et un sujet qui demande un avis sur le même thème → DIFFÉRENTS.

Dans le doute, réponds -1 (nouveau) : un doublon se voit et s'efface en un clic, un sujet perdu ne se récupère pas.

Réponds uniquement avec un objet JSON : {"resultats":[{"id":<id du candidat>,"connu":<id du sujet connu identique, ou -1>}]}, un élément par candidat.`;

// Comparison only needs the opening situation, not whole documents.
const EXCERPT = 320;
const MAX_KNOWN = 60;
const MAX_CANDIDATES = 20;
// The answer itself is a few tokens per candidate, but gpt-oss reasons before
// it answers and that counts against the same budget. Sizing this to the
// visible JSON truncates the reply, which then fails to parse and silently
// skips the whole check — so the allowance is deliberately generous.
const tokenBudget = (n) => Math.min(2000, 400 + 45 * n);

const brief = (t) => String(t).replace(/\s+/g, " ").trim().slice(0, EXCERPT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One comparison call, waiting out Groq's per-minute limit. Without this a
// rate-limited run quietly imports duplicates, which is the exact failure this
// module exists to prevent.
async function ask(payload, size, deadline) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await groqChatJSON(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(payload) },
        ],
        { maxTokens: tokenBudget(size), temperature: 0 },
      );
      // Same reason as the reformulation step: an unmetered consumer of the
      // shared budget makes the headroom figure a guess.
      logAiUsage({ endpoint: "sujets-dedupe", kind: "chat", model: res.model, usage: res.usage });
      return res;
    } catch (err) {
      if (err?.upstreamStatus !== 429 || attempt === 3) return null;
      const wait = Math.min(err.retryAfterMs || 5000, 25000) + 500;
      if (Date.now() + wait >= deadline) return null;
      await sleep(wait);
    }
  }
  return null;
}

// `candidates` and `known` are [{ id, text }]. Returns the Set of candidate ids
// the model recognised as already present.
export async function findDuplicates(candidates, known, { deadline = Infinity } = {}) {
  const dupes = new Set();
  if (!candidates.length || !known.length) return dupes;

  const connus = known.slice(0, MAX_KNOWN).map((k) => ({ id: k.id, texte: brief(k.text) }));
  const knownIds = new Set(connus.map((k) => k.id));

  for (let i = 0; i < candidates.length; i += MAX_CANDIDATES) {
    const batch = candidates.slice(i, i + MAX_CANDIDATES);
    if (Date.now() >= deadline) break; // out of time: import them rather than lose them
    const payload = { connus, candidats: batch.map((c) => ({ id: c.id, texte: brief(c.text) })) };
    const res = await ask(payload, batch.length, deadline);
    if (!res) continue; // never lose a subject to an upstream failure
    const ids = new Set(batch.map((c) => c.id));
    for (const r of Array.isArray(res?.json?.resultats) ? res.json.resultats : []) {
      if (ids.has(Number(r?.id)) && knownIds.has(Number(r?.connu))) dupes.add(Number(r.id));
    }
  }
  return dupes;
}
