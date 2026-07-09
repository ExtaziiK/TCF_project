import { EN } from "@/i18n/en";

// The UI is authored in French (the source language). English is looked up
// in the EN dictionary by the exact French string; a missing entry falls
// back to the French text, so partially translated screens stay usable.
const STORAGE_KEY = "passerelle.lang";

export const translate = (lang, text) => (lang === "en" && text in EN ? EN[text] : text);

export function loadLang() {
  try { return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr"; } catch { return "fr"; }
}

export function saveLang(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode: language just won't persist */ }
}
