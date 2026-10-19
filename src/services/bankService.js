import MANIFEST from "virtual:bank-manifest";
import { adaptBankFile } from "@/utils/bankAdapter";

// Auto-discovers everything under src/bank/ at build time. Adding a JSON to
// a section folder, or media files to media/audio | media/images, is enough:
// the dev server hot-reloads them and production builds bundle them.
//
// The quiz files are NOT in the entry bundle: each one is its own chunk,
// fetched the first time a page asks for it (loadQuiz / loadBank). What only
// needs the bank's shape — counts, quiz lists, order — reads the build-time
// manifest instead (getBankSummary; see scripts/bankManifestPlugin.mjs), so the
// landing page, the Épreuves grid and the dashboard never download a quiz.
const quizLoaders = import.meta.glob("/src/bank/{co,ce,ee,eo}/*.json", { import: "default" });
const audioFiles = import.meta.glob("/src/bank/media/audio/*.{mp3,wav,ogg,m4a,aac}", { eager: true, query: "?url", import: "default" });
const imageFiles = import.meta.glob("/src/bank/media/images/*.{webp,png,jpg,jpeg,gif,svg}", { eager: true, query: "?url", import: "default" });

export const BANK_SECTIONS = ["co", "ce", "ee", "eo"];

// media maps: lowercase basename without extension -> bundled URL
function toMediaMap(files) {
  const map = {};
  for (const [path, url] of Object.entries(files)) {
    const name = path.split("/").pop().replace(/\.[^.]+$/, "").toLowerCase();
    map[name] = url;
  }
  return map;
}

const audioMap = toMediaMap(audioFiles);
const imageMap = toMediaMap(imageFiles);

const sortQuizzes = (list) =>
  list.sort((a, b) => (a.quizNumber ?? 1e9) - (b.quizNumber ?? 1e9) || a.title.localeCompare(b.title));

const emptyBank = () => Object.fromEntries(BANK_SECTIONS.map((s) => [s, []]));

/* ------------------------------- state ---------------------------------- */

const fileQuizzes = new Map(); // quiz id -> adapted quiz, once its chunk has loaded
const pending = new Map(); // quiz id -> in-flight load
let adminQuizzes = []; // Question Management System quizzes, always in memory
const listeners = new Set();
let version = 0;

const changed = () => {
  version++;
  for (const fn of listeners) fn();
};

// Quiz ids are `${section}-${fileName}` (bankAdapter), so the file is known
// from the id alone.
function pathFor(quizId) {
  const dash = quizId.indexOf("-");
  return dash > 0 ? `/src/bank/${quizId.slice(0, dash)}/${quizId.slice(dash + 1)}` : null;
}

function adaptFile(path, raw) {
  const parts = path.split("/");
  const fileName = parts.pop();
  const section = parts.pop();
  return adaptBankFile(raw, { section, fileName, audioMap, imageMap });
}

/* ------------------------------- loading -------------------------------- */

// One full quiz (questions, media, answers), by id. Resolves to null for an
// id the bank does not have. Cached: a second call costs nothing.
export function loadQuiz(quizId) {
  const id = String(quizId);
  const admin = adminQuizzes.find((q) => String(q.id) === id);
  if (admin) return Promise.resolve(admin);
  if (fileQuizzes.has(id)) return Promise.resolve(fileQuizzes.get(id));
  if (!pending.has(id)) {
    const path = pathFor(id);
    const loader = path && quizLoaders[path];
    if (!loader) return Promise.resolve(null);
    pending.set(id, loader().then(
      (raw) => {
        const quiz = adaptFile(path, raw);
        fileQuizzes.set(id, quiz);
        pending.delete(id);
        return quiz;
      },
      (err) => {
        pending.delete(id); // a failed fetch (offline, new deploy) can be retried
        throw err;
      }
    ));
  }
  return pending.get(id);
}

// Every quiz of the given sections, fully loaded, as { co: [...], ce: [...],
// ee: [...], eo: [...] } — the shape getBank() used to return synchronously.
// Sections not asked for come back empty.
export async function loadBank(sections = BANK_SECTIONS) {
  const wanted = [].concat(sections);
  await Promise.all(wanted.flatMap((s) => (MANIFEST[s] || []).map((e) => loadQuiz(e.id))));
  const bank = emptyBank();
  for (const s of wanted) {
    if (!bank[s]) continue;
    for (const e of MANIFEST[s] || []) {
      const quiz = fileQuizzes.get(e.id);
      if (quiz) bank[s].push(quiz);
    }
  }
  for (const quiz of adminQuizzes) if (wanted.includes(quiz.section)) bank[quiz.section].push(quiz);
  for (const list of Object.values(bank)) sortQuizzes(list);
  return bank;
}

export const loadBankAll = () => loadBank(BANK_SECTIONS);

/* ------------------------------- summary -------------------------------- */

// The bank without its questions: { co: [{ id, title, section, quizNumber,
// count, kind? }], ... }, in display order, admin quizzes included. Instant —
// no download. Same object until the bank changes, so it is safe as a
// useSyncExternalStore snapshot or a memo dependency.
let summaryCache = null;
let summaryVersion = -1;
export function getBankSummary() {
  if (summaryVersion === version) return summaryCache;
  const summary = emptyBank();
  for (const s of BANK_SECTIONS) summary[s].push(...(MANIFEST[s] || []));
  for (const quiz of adminQuizzes) {
    summary[quiz.section].push({
      id: quiz.id, title: quiz.title, section: quiz.section, quizNumber: quiz.quizNumber,
      count: quiz.questions.length, ...(quiz.kind ? { kind: quiz.kind } : {}),
    });
  }
  for (const list of Object.values(summary)) sortQuizzes(list);
  summaryCache = summary;
  summaryVersion = version;
  return summary;
}

// Question ids per quiz ([{ id, title, section, quizNumber, kind?, ids }]) — enough to tell
// whether a question is still in the bank without loading any quiz. Its own
// small chunk, fetched on first use.
let questionIdsPromise = null;
export async function loadQuestionIds() {
  questionIdsPromise ||= import("virtual:bank-question-ids").then((m) => m.default);
  const fromFiles = await questionIdsPromise;
  return [
    ...fromFiles,
    ...adminQuizzes.map((q) => ({ id: q.id, title: q.title, section: q.section, quizNumber: q.quizNumber, kind: q.kind, ids: q.questions.map((x) => x.id) })),
  ];
}

/* --------------------------- admin injection ---------------------------- */

// Merges admin-authored quizzes (Question Management System) into the bank,
// replacing any previous admin injection. Called at app start and after any
// QMS change, so the whole site reflects admin edits immediately.
export function injectAdminQuizzes(quizzes) {
  adminQuizzes = quizzes.filter((quiz) => quiz.questions.length > 0 && BANK_SECTIONS.includes(quiz.section));
  changed();
}

export function subscribeBank(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getBankStats() {
  return {
    localAudioCount: Object.keys(audioMap).length,
    localImageCount: Object.keys(imageMap).length,
  };
}
