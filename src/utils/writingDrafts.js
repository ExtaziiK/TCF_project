// What a candidate has written for an Expression écrite subject, kept so it is
// never lost: switching tâche tabs used to unmount the editor and wipe the
// text, and on exam day moving between the three tâches is exactly what
// candidates do. Text, plan (brouillon), time left and the overtime choice
// live in localStorage per subject (so a reload keeps them too); the AI
// feedback, which is larger and per session, lives in memory.
//
// Storage can be unavailable (private mode) or full: every access is guarded,
// and the workshop then simply keeps the draft for the visit only.

const KEY = (id) => `passerelle.ee.draft.${id}`;
const memory = new Map(); // id -> { ai, lastRun }

export function loadDraft(id) {
  try { return JSON.parse(window.localStorage.getItem(KEY(id))) || {}; } catch { return {}; }
}

export function saveDraft(id, draft) {
  try { window.localStorage.setItem(KEY(id), JSON.stringify(draft)); } catch { /* kept for this visit only */ }
}

export function clearDraft(id) {
  memory.delete(id);
  try { window.localStorage.removeItem(KEY(id)); } catch { /* nothing to clear */ }
}

export const sessionFeedback = {
  get: (id) => memory.get(id) || {},
  set: (id, value) => memory.set(id, { ...memory.get(id), ...value }),
};

// Words as the exam's counter counts them: runs of non-space characters.
export const countWords = (text) => (String(text || "").trim() ? String(text).trim().split(/\s+/).length : 0);
