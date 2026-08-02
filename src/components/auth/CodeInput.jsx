import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";

const LENGTH = 6;

// Six boxes drawn over ONE real input.
//
// Six separate <input>s is the obvious build and the fragile one: a pasted code
// lands entirely in the first box, the browser's one-time-code autofill has
// nowhere to put six digits at once, and every backspace needs manual focus
// juggling across refs. Keeping a single input means paste, autofill, the
// mobile numeric keypad and text selection all behave natively — the boxes are
// only a rendering of its value, and the caret is drawn on whichever box is
// next to be filled.
export function CodeInput({ value, onChange, onComplete, disabled, label }) {
  const { c } = useApp();
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  // Where the next digit lands. LENGTH once the code is complete, which is also
  // how "no caret to draw" is expressed.
  const caretAt = value.length;

  const change = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
    onChange(next);
    if (next.length === LENGTH) onComplete?.(next);
  };

  // Typing always appends. A caret dropped into the middle by a click would
  // otherwise edit a digit the boxes present as already settled.
  const toEnd = () => {
    const el = ref.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  };

  return (
    <div className="relative mt-6">
      <div className="flex justify-center gap-2 sm:gap-2.5" aria-hidden="true">
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && i === caretAt;
          const filled = i < value.length;
          return (
            <div
              key={i}
              className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl border-2 flex items-center justify-center font-mono2 text-2xl font-bold transition-colors ${
                active
                  ? "border-blue-600 ring-4 ring-blue-600/15"
                  : filled
                    ? `border-blue-600/40 ${c.text}`
                    : c.inputCls
              }`}
            >
              {filled ? value[i] : active ? <span className="w-[2px] h-7 bg-blue-600 caret-blink" /> : null}
            </div>
          );
        })}
      </div>

      {/* The real control: invisible, but stretched over the boxes so a tap
          anywhere on the row focuses it. */}
      <input
        ref={ref}
        value={value}
        onChange={change}
        onFocus={() => { setFocused(true); toEnd(); }}
        onBlur={() => setFocused(false)}
        onSelect={toEnd}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={LENGTH}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}
