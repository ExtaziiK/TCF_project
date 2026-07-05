import { useEffect, useState } from "react";
import { loadCustomListening, saveCustomListening } from "@/services/customListeningService";

// Owns the admin-imported listening questions: loads them on mount, persists
// every mutation, and reports the outcome through `notify`.
export function useCustomListening(notify) {
  const [customListen, setCustomListen] = useState([]);

  useEffect(() => {
    loadCustomListening().then(setCustomListen);
  }, []);

  const addListeningQuestions = async (items) => {
    const next = [...customListen, ...items];
    setCustomListen(next);
    const persisted = await saveCustomListening(next);
    notify(persisted ? `${items.length} question(s) importée(s) et sauvegardées.` : `${items.length} question(s) importée(s) pour cette session (stockage persistant indisponible ici).`);
  };

  const removeListeningQuestion = async (id) => {
    const next = customListen.filter((q) => q.id !== id);
    setCustomListen(next);
    await saveCustomListening(next);
  };

  const clearListeningQuestions = async () => {
    setCustomListen([]);
    await saveCustomListening([]);
    notify("Toutes les questions importées ont été supprimées.");
  };

  return { customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions };
}
