import { useState } from "react";
import { Keyboard } from "lucide-react";
import { useApp } from "@/context/AppContext";

// The on-screen French keyboard a real exam station offers, for candidates
// whose physical keyboard cannot type accents.
//
// Extracted from the Expression écrite workshop so the dictée uses the SAME
// keys, the same "Maj" behaviour and the same remembered show/hide choice —
// a second copy would drift, and a candidate who hid the keys in one place
// would find them back in the other.
//
// Base = lowercase; "Maj" inserts the uppercase form (JS upper-cases œ→Œ,
// ç→Ç, æ→Æ too).
export const ACCENT_KEYS = ["à", "â", "æ", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "œ", "ù", "û", "ü", "ÿ", "«", "»"];

const FRKB_STORE = "passerelle.frkb"; // "0" = the candidate hid it (has a FR keyboard)

// Inserts a character at the caret of `ref`'s textarea/input.
// execCommand("insertText") keeps the native undo/redo stack and fires a real
// input event (so a controlled onChange runs and the caret stays put); falls
// back to a manual splice where it is unavailable.
export function insertAtCaret(ref, ch, value, onChange) {
  const el = ref.current;
  if (!el) return;
  el.focus();
  if (document.execCommand && document.execCommand("insertText", false, ch)) return;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  onChange(value.slice(0, start) + ch + value.slice(end));
  window.requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + ch.length; });
}

// The attributes that stop the browser — and Grammarly-style extensions —
// helping the candidate spell. Exported as one object because forgetting a
// single one silently defeats the exercise: a spell-checker underlining
// "developpement" gives away the most valuable error a dictée can catch.
export const NO_ASSIST_PROPS = {
  spellCheck: false,
  autoCorrect: "off",
  autoCapitalize: "off",
  autoComplete: "off",
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
};

// `onInsert` receives the character to place at the caret. `right` renders at
// the far end of the toolbar (the word count in Expression écrite, nothing in
// the dictée).
export function AccentKeys({ onInsert, right = null }) {
  const { c, t } = useApp();
  const [shift, setShift] = useState(false);
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(FRKB_STORE) !== "0"; } catch { return true; }
  });

  const toggle = () => setOn((v) => {
    const next = !v;
    try { localStorage.setItem(FRKB_STORE, next ? "1" : "0"); } catch { /* storage blocked */ }
    return next;
  });

  return (
    <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${c.border} flex-wrap`}>
      <button
        type="button" onClick={toggle} aria-pressed={on}
        title={t("Afficher ou masquer le clavier d'accents")}
        className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors ${on ? "border-blue-600 text-blue-600 bg-blue-600/5" : `${c.border} ${c.faint} ${c.hoverSoft}`}`}
      >
        <Keyboard size={14} /> {t("Accents")}{on ? "" : ` · ${t("masqué")}`}
      </button>
      {on && (
        <>
          {/* preventDefault on mousedown so the field never loses focus and the
              caret stays exactly where the candidate left it. */}
          <button
            type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShift((s) => !s)}
            aria-pressed={shift} title={t("Majuscule")}
            className={`w-11 h-9 rounded-lg border text-xs font-bold transition-colors ${shift ? "border-blue-600 bg-blue-600/10 text-blue-600" : `${c.border} ${c.sub} ${c.hoverSoft}`}`}
          >
            Maj
          </button>
          {ACCENT_KEYS.map((base) => {
            const ch = shift ? base.toUpperCase() : base;
            return (
              <button
                key={base} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(ch)}
                aria-label={`${t("Insérer")} ${ch}`}
                className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-all ${c.border} ${c.text} ${c.hoverSoft} hover:border-blue-600 hover:text-blue-600`}
              >
                {ch}
              </button>
            );
          })}
        </>
      )}
      {right}
    </div>
  );
}
