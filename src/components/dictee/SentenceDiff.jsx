import { useApp } from "@/context/AppContext";

// One corrected sentence: the text the candidate HEARD, rebuilt from its own
// source string so the punctuation, spacing and hyphens are the real ones, with
// a verdict on each word. Where they wrote something different, their version
// follows the expected one, struck through — seeing "économique / economique"
// side by side teaches more than either word alone.

const TONE = {
  // Correct words stay unmarked. A page where every word is highlighted
  // highlights nothing, and the eye needs somewhere to rest to find the errors.
  ok: "",
  accent: "bg-amber-500/15 text-amber-600 rounded px-0.5",
  wrong: "bg-rose-500/15 text-rose-600 rounded px-0.5",
  missing: "bg-rose-500/15 text-rose-600 rounded px-0.5 underline decoration-dashed underline-offset-4",
};

export function SentenceDiff({ diff, className = "" }) {
  const { c } = useApp();
  const nodes = [];
  let cursor = 0;

  diff.words.forEach((w, i) => {
    const gap = diff.source.slice(cursor, w.exp.start);
    if (gap) nodes.push(<span key={`g${i}`}>{gap}</span>);
    nodes.push(
      <span key={`w${i}`} className={TONE[w.status]}>
        {w.exp.raw}
        {w.got && w.got.toLowerCase() !== w.exp.raw.toLowerCase() && (
          <span className={`ml-1 text-[0.85em] line-through opacity-70 ${c.faint}`}>{w.got}</span>
        )}
      </span>,
    );
    cursor = w.exp.end;
  });
  nodes.push(<span key="tail">{diff.source.slice(cursor)}</span>);

  return (
    <div className={className}>
      <p className={`leading-loose ${c.text}`}>{nodes}</p>
      {diff.extras.length > 0 && (
        <p className={`mt-2 text-xs ${c.faint}`}>
          Mots ajoutés qui n'étaient pas dictés :{" "}
          <span className="line-through">{diff.extras.join(", ")}</span>
        </p>
      )}
    </div>
  );
}
