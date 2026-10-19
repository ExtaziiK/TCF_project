import { useEffect, useState, useSyncExternalStore } from "react";
import { BANK_SECTIONS, getBankSummary, loadBank, loadQuiz, subscribeBank } from "@/services/bankService";

// The summary, re-rendering when admin quizzes are injected.
export function useBankSummary() {
  return useSyncExternalStore(subscribeBank, getBankSummary);
}

// Full quizzes for the given sections: null while their chunks download, then
// the bank (reloaded after an admin injection). `error` is set if a chunk
// failed to load; `retry` tries again.
export function useBank(sections = BANK_SECTIONS) {
  const key = [].concat(sections).join(",");
  const [state, setState] = useState({ bank: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ bank: null, error: null });
    const run = () => loadBank(key.split(",")).then(
      (bank) => live && setState({ bank, error: null }),
      (error) => live && setState((s) => ({ bank: s.bank, error }))
    );
    run();
    const unsubscribe = subscribeBank(run);
    return () => { live = false; unsubscribe(); };
  }, [key, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// One full quiz, looked up by épreuve and number (the landing demos read quiz
// 1): `quiz` is null while it downloads; `settled` turns true once it has
// arrived — or failed, or does not exist — so a caller can fall back.
export function useQuizByNumber(section, number) {
  const [state, setState] = useState({ quiz: null, settled: false });
  useEffect(() => {
    let live = true;
    const entry = (getBankSummary()[section] || []).find((q) => q.quizNumber === number);
    if (!entry) {
      setState({ quiz: null, settled: true });
      return undefined;
    }
    loadQuiz(entry.id).then(
      (quiz) => live && setState({ quiz, settled: true }),
      () => live && setState({ quiz: null, settled: true })
    );
    return () => { live = false; };
  }, [section, number]);
  return state;
}
