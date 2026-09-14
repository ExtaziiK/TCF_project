import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError, groqChatJSON } from "../groq.js";
import { logAiUsage } from "../usage.js";
import { enforceRateLimit } from "../ratelimit.js";

// POST /api/admin/sujet-answers — writes the three model answers (« modèles de
// réponse ») for ONE Expression écrite combinaison into sujets_answers. Backs
// the "Générer les réponses" button in the admin Sujets tab.
//
// One combinaison per request, on purpose: vercel.json caps api/admin at
// maxDuration 60, and a month of seven combinaisons is ~21 answers — far past
// that in a single call. The admin client loops and shows progress, so a failed
// combinaison costs one retry instead of the whole month.
//
// Unlike the subjects importer next door, this one DOES write on the server
// call: the answers are published on generation, by product decision. Nothing
// reaches a non-Premium visitor either way — the table's RLS
// (20260913_sujets_answers.sql) gates reads on is_premium().

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// The official TCF Canada requirements per tâche. Kept in step with
// src/constants/guideEE.js (EE_METHOD), which is what the candidate reads on
// the guide page — a corrigé must obey the rules the guide teaches.
const TASKS = {
  1: {
    label: "Tâche 1 — message",
    words: "60 à 120 mots",
    target: 100,
    rules: "Un message personnel (courriel, mot, message) adressé à la personne nommée dans la consigne. Registre courant ou amical selon le destinataire. Formule d'appel et formule de congé obligatoires. Traiter TOUS les points de la consigne, sans en inventer d'autres.",
  },
  2: {
    label: "Tâche 2 — article, courrier ou note",
    words: "120 à 150 mots",
    target: 140,
    rules: "Un texte structuré (article, billet de blog, courrier ou note) destiné à un lectorat, pas à un ami. Registre semi-formel. Introduction qui pose le sujet, deux ou trois paragraphes de développement avec des exemples concrets, conclusion. Traiter TOUS les points de la consigne.",
  },
  3: {
    label: "Tâche 3 — comparer deux points de vue",
    words: "120 à 180 mots",
    target: 165,
    rules: "Deux parties nettes. 1) Comparer objectivement les deux documents : ce qu'ils affirment, ce qui les oppose, sans donner son avis. 2) Donner et argumenter SON propre point de vue, avec au moins deux arguments et un exemple. Registre formel, connecteurs logiques explicites.",
  },
};

const SYSTEM = `Tu es examinateur du TCF Canada et rédacteur de corrigés pour l'épreuve d'expression écrite.

Tu produis des MODÈLES DE RÉPONSE de niveau C1-C2 : le texte qu'un excellent candidat rendrait le jour de l'examen. Pas un cours, pas de méta-commentaire, pas de titre — uniquement la production elle-même, rédigée en français, prête à servir de modèle.

Règles absolues :
- Respecte la fourchette de mots de chaque tâche. Hors fourchette, la copie est pénalisée à l'examen : c'est une erreur, pas un détail.
- Traite tous les points de la consigne donnée, et rien d'autre. Au TCF, un texte hors-sujet vaut zéro, si bien écrit soit-il.
- Niveau C1-C2 : subordination maîtrisée, connecteurs variés, lexique précis et idiomatique, nuance. Jamais de phrases juxtaposées simplistes.
- Français de France ou du Canada, naturel. Aucun anglicisme, aucune tournure traduite.
- Invente les détails concrets qui manquent (prénoms, dates, lieux) : un modèle doit être complet et vivant.

Pour chaque tâche, fournis aussi les expressions fortes à mémoriser : des tournures réutilisables dans N'IMPORTE quel sujet de la même tâche (articulateurs, formules d'ouverture et de clôture, tournures d'opinion, locutions soutenues). Pas de mots isolés banals, rien qui soit propre à ce sujet précis — ce sont des briques transposables. Chaque expression doit apparaître MOT POUR MOT dans le texte que tu viens d'écrire.

Réponds en JSON strict :
{"t1":{"body":"…","keywords":["…"]},"t2":{"body":"…","keywords":["…"]},"t3":{"body":"…","keywords":["…"]}}
6 à 10 expressions par tâche. Le body ne contient aucun balisage, seulement des paragraphes séparés par \\n\\n.`;

// Trims a generated answer to what we agreed to store: plain paragraphs, no
// stray heading the model sometimes puts above a "corrigé".
const clean = (s) =>
  String(s || "")
    .replace(/\r/g, "")
    .replace(/^\s*(#+|\*\*)\s*.*(corrig|mod[èe]le|t[âa]che)\s*\d*\s*(\*\*)?\s*:?\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const countWords = (s) => (s.match(/[\p{L}\p{N}'’-]+/gu) || []).length;

// The word range each tâche is marked against — the same bounds the guide and
// the grader use.
const RANGE = { 1: [60, 120], 2: [120, 150], 3: [120, 180] };

// A keyword is only worth storing if it really occurs in the body: the page
// highlights them by exact match, so a phrase the model "suggested" but never
// used would render as a dead entry in the « à mémoriser » list.
function usableKeywords(list, body) {
  const hay = body.toLowerCase();
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

function buildPrompt({ t1, t2, t3 }) {
  const docs = [t3?.doc1, t3?.doc2].filter(Boolean);
  const spec = (n, consigne) =>
    `### ${TASKS[n].label}\nLongueur imposée : ${TASKS[n].words} (vise ${TASKS[n].target}).\nAttendu : ${TASKS[n].rules}\nConsigne réelle : ${consigne}`;
  const parts = [];
  if (t1) parts.push(spec(1, t1));
  if (t2) parts.push(spec(2, t2));
  if (t3?.theme || docs.length) {
    const body = [t3?.theme && `Thème : ${t3.theme}`, ...docs.map((d, i) => `Document ${i + 1} : ${d}`)].filter(Boolean).join("\n");
    parts.push(spec(3, `\n${body}`));
  }
  return `Rédige le modèle de réponse de chacune des tâches ci-dessous.\n\n${parts.join("\n\n")}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await requireAdmin(req);

    const { section, year, monthNum, n, t1, t2, t3 } = req.body || {};
    if (section !== "ee") throw new HttpError(400, "Les modèles de réponse n'existent que pour l'expression écrite.");
    if (!Number.isInteger(year) || !Number.isInteger(monthNum) || !Number.isInteger(n)) {
      throw new HttpError(400, "Mois ou combinaison invalide.");
    }
    if (!t1 && !t2 && !t3) throw new HttpError(400, "Cette combinaison n'a aucune tâche à corriger.");

    // Each combinaison is one billable Groq call, and the client loops over a
    // month — so the ceiling is generous. It stops a stuck loop, not the work.
    await enforceRateLimit(req, { name: "sujet-answers", limit: 60, windowSeconds: 600, userId: user.id });

    const started = Date.now();
    // Warmer than the graders: a corrigé should read like writing, not like the
    // same three sentences reshuffled across every month.
    const { json, usage, model } = await groqChatJSON(
      [{ role: "system", content: SYSTEM }, { role: "user", content: buildPrompt({ t1, t2, t3 }) }],
      { maxTokens: 4000, temperature: 0.7 },
    );
    const durationMs = Date.now() - started;

    logAiUsage({ userId: user.id, endpoint: "admin/sujet-answers", kind: "chat", model, usage, durationMs });

    const rows = [];
    const warnings = [];
    for (const tache of [1, 2, 3]) {
      const body = clean(json?.[`t${tache}`]?.body);
      if (!body) continue;
      const words = countWords(body);
      const [lo, hi] = RANGE[tache];
      // Recorded, not rejected: a corrigé eight words over is still worth
      // having, and the admin sees which ones are worth re-generating.
      if (words < lo || words > hi) warnings.push(`Tâche ${tache} : ${words} mots (attendu ${lo}–${hi}).`);
      rows.push({
        section,
        year,
        month_num: monthNum,
        n,
        tache,
        body,
        keywords: usableKeywords(json?.[`t${tache}`]?.keywords, body),
        model,
        generated_at: new Date().toISOString(),
        updated_by: user.id,
      });
    }
    if (!rows.length) throw new HttpError(502, "L'IA n'a renvoyé aucun texte exploitable.");

    const { error } = await admin.from("sujets_answers").upsert(rows, { onConflict: "section,year,month_num,n,tache" });
    if (error) throw new HttpError(500, `Enregistrement impossible : ${error.message}`);

    res.status(200).json({ n, taches: rows.map((r) => r.tache), warnings });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "La génération du modèle de réponse a échoué." });
  }
}
