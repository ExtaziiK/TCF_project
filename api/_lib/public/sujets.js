import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireUser } from "../auth.js";
import { HttpError } from "../groq.js";
import { enforceRateLimit } from "../ratelimit.js";

// The shipped subjects archive, for signed-in accounts only.
//
//   GET /api/public/sujets?section=ee|eo
//
// The archive used to be static files in public/data, which made every
// subject downloadable by anyone who knew the URL, account or not. They now
// live in data/sujets (outside the public folder, so never served as-is) and
// reach the browser only through here, behind a valid session. Grouped with
// the small public routes purely for the Vercel function count (see
// api/public/[resource].js). The files ship with this function through
// vercel.json `includeFiles`.
//
// Months an admin adds or edits live in the sujets_archive table, readable by
// signed-in accounts only (20261025_sujets_archive_private.sql); the client
// layers them over this base (src/services/sujetsArchiveService.js).

const SECTIONS = new Set(["ee", "eo"]);
const cache = new Map();

const candidates = (section) => [
  path.join(process.cwd(), "data", "sujets", `sujets-${section}.json`),
  fileURLToPath(new URL(`../../../data/sujets/sujets-${section}.json`, import.meta.url)),
];

async function readSection(section) {
  if (cache.has(section)) return cache.get(section);
  for (const file of candidates(section)) {
    try {
      const body = await readFile(file, "utf8");
      JSON.parse(body); // refuse to serve a corrupt file
      cache.set(section, body);
      return body;
    } catch {
      // Not at this location — try the next one.
    }
  }
  throw new HttpError(502, "Le recueil de sujets est introuvable sur le serveur.");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    const section = String(req.query.section || "");
    if (!SECTIONS.has(section)) throw new HttpError(400, "Section inconnue.");
    const user = await requireUser(req);
    await enforceRateLimit(req, { name: "sujets", limit: 60, windowSeconds: 60, userId: user.id });
    const body = await readSection(section);
    // Per-account content: never in a shared cache.
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(body);
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(err.status || 500).json({ error: err.message || "Requête refusée." });
  }
}
