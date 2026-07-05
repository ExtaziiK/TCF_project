// Turns a pasted/uploaded JSON array of { audio, question, alternatives, answer_index, explanation, level }
// into the internal question shape used by the Quiz engine ({ q, opts, a, exp, level, audio, custom }).
export function normalizeImportedQuestions(raw) {
  if (!Array.isArray(raw)) throw new Error("Le JSON doit être une liste (un tableau) de questions.");
  return raw.map((item, idx) => {
    const alts = item.alternatives || item.options;
    if (!item.question || !Array.isArray(alts) || alts.length < 2) {
      throw new Error(`Question ${idx + 1} : il faut au moins un champ "question" et un tableau "alternatives" (2 choix minimum).`);
    }
    const ai = Number.isInteger(item.answer_index) ? item.answer_index : 0;
    return {
      id: `custom-listen-${Date.now()}-${idx}`,
      q: item.question,
      opts: alts,
      a: ai,
      exp: item.explanation || "",
      level: item.level || "Mixte",
      audio: item.audio || "",
      custom: true,
    };
  });
}
