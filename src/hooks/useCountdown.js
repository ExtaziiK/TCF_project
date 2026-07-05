import { useEffect, useState } from "react";

// Ticks `secondsLeft` down to 0 once per second while `isActive` is true,
// firing `onComplete` on the tick that reaches 0.
export function useCountdown(initialSeconds, isActive, onComplete) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);
  return [secondsLeft, setSecondsLeft];
}
