import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";

// One box per digit, drawn over ONE real input.
//
// One <input> per box is the obvious build and the fragile one: a pasted code
// lands entirely in the first box, the browser's one-time-code autofill has
// nowhere to put the whole code at once, and every backspace needs manual focus
// juggling across refs. Keeping a single input means paste, autofill, the
// mobile numeric keypad and text selection all behave natively — the boxes are
// only a rendering of its value, and the caret is drawn on whichever box is
// next to be filled.
//
// `length` comes from CONFIRM_CODE_LENGTH, which tracks Supabase's "Email OTP
// Length" setting — it is 8 on this project, not the 6 Supabase ships by
// default.
export function CodeInput({ value, onChange, onComplete, disabled, label, length = 6 }) {
  const { c } = useApp();
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  // Where the next digit lands. Equal to `length` once the code is complete,
  // which is also how "no caret to draw" is expressed.
  //
  // Eight boxes have to fit a 360px phone, so they are sized down past six
  // rather than overflowing the card.
  const tight = length > 6;
  const caretAt = value.length;

  const change = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  // Typing always appends. A caret dropped into the middle by a click would
  // otherwise edit a digit the boxes present as already settled.
  const toEnd = () => {
    const el = ref.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  };

  return (
    <div className="relative mt-6">
      <div className={`flex justify-center ${tight ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5"}`} aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const active = focused && i === caretAt;
          const filled = i < value.length;
          return (
            <div
              key={i}
              className={`${tight ? "w-9 h-12 sm:w-11 sm:h-14 text-xl" : "w-11 h-14 sm:w-12 sm:h-16 text-2xl"} rounded-xl border-2 flex items-center justify-center font-mono2 font-bold transition-colors ${
                active
                  ? "border-blue-600 ring-4 ring-blue-600/15"
                  : filled
                    ? `border-blue-600/40 ${c.text}`
                    : c.inputCls
              }`}
            >
              {filled ? value[i] : active ? <span className={`w-[2px] ${tight ? "h-6" : "h-7"} bg-blue-600 caret-blink`} /> : null}
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
        maxLength={length}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}
