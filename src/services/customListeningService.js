import { CUSTOM_LISTENING_KEY } from "@/constants/listeningImport";

// Persists admin-imported listening questions. Prefers the shared
// window.storage API when the host provides one (artifact environment);
// falls back to localStorage in a regular browser.

export async function loadCustomListening() {
  try {
    if (typeof window === "undefined") return [];
    if (window.storage) {
      const res = await window.storage.get(CUSTOM_LISTENING_KEY, true);
      return res && res.value ? JSON.parse(res.value) : [];
    }
    const raw = window.localStorage.getItem(CUSTOM_LISTENING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomListening(list) {
  try {
    if (typeof window === "undefined") return false;
    if (window.storage) {
      await window.storage.set(CUSTOM_LISTENING_KEY, JSON.stringify(list), true);
      return true;
    }
    window.localStorage.setItem(CUSTOM_LISTENING_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
