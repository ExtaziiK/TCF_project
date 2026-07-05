import { useCallback, useState } from "react";

// Manages a list of unique items with add/remove-by-toggle semantics
// (used for bookmarks and vocabulary favorites).
export function useToggleSet(initial = []) {
  const [items, setItems] = useState(initial);
  const toggle = useCallback((item) => {
    setItems((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }, []);
  return [items, toggle, setItems];
}
