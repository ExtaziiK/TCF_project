import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Loader2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/common";
import { useApp } from "@/context/AppContext";
import { RealAudio } from "@/components/quiz/RealAudio";
import { isImagePreloaded, markImagePreloaded } from "@/utils/imagePreload";

// Illustration for a question. The caller renders this only for questions that
// genuinely carry an image (CO listening illustrations, every CE document), so
// we can hold a labelled loading placeholder in place while the picture arrives
// — reserving the space and telling the user an image is on its way instead of
// popping it in unannounced after a delay. The <img> loads while hidden
// (display:none), so onLoad/onError fire normally. Images prefetched by the quiz
// (see utils/imagePreload) start "loaded", so navigating between already-seen
// questions shows them instantly with no skeleton. In signed-media mode `src` is
// briefly null until the batch of signed URLs resolves — the skeleton covers
// that gap too, with a timeout fallback so a signing failure collapses the frame
// rather than spinning forever. A genuine load error also hides the frame (a few
// legacy convention URLs point at images that don't exist).
// The "Agrandir" magnifier enlarges the document in place (it grows to the
// full column width) rather than in a full-screen overlay, so the question
// and answers below stay visible while the fine print is readable.
function QuestionImage({ src }) {
  const { c } = useApp();
  const [status, setStatus] = useState(() => (isImagePreloaded(src) ? "loaded" : "loading")); // loading | loaded | failed
  const [big, setBig] = useState(false);
  useEffect(() => { setStatus(isImagePreloaded(src) ? "loaded" : "loading"); setBig(false); }, [src]);
  // Signing gap: still no src and nothing preloaded. Give the signed URL a
  // bounded window to arrive, then treat it as failed so the placeholder doesn't
  // linger indefinitely if signing never resolves.
  useEffect(() => {
    if (src || status !== "loading") return;
    const id = setTimeout(() => setStatus("failed"), 15000);
    return () => clearTimeout(id);
  }, [src, status]);

  if (status === "failed") return null;
  const loaded = status === "loaded";
  return (
    <Card className="p-4">
      <div className="relative">
        {!loaded && (
          <div
            role="status"
            aria-live="polite"
            className={`img-skeleton ${c.track} rounded-2xl w-full min-h-[220px] md:min-h-[280px] flex flex-col items-center justify-center gap-2`}
          >
            <ImageIcon size={26} className={c.faint} aria-hidden="true" />
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.faint}`}>
              <Loader2 size={13} className="animate-spin" /> Chargement de l'image…
            </span>
          </div>
        )}
        {src && (
          <img
            src={src}
            alt="Illustration de la question"
            className={loaded ? `rounded-2xl object-contain mx-auto transition-all duration-300 ${big ? "w-full max-h-[80vh]" : "max-h-80 md:max-h-96"}` : "hidden"}
            onLoad={() => { markImagePreloaded(src); setStatus("loaded"); }}
            onError={() => setStatus("failed")}
          />
        )}
        {loaded && (
          <button
            type="button"
            onClick={() => setBig((v) => !v)}
            aria-label={big ? "Réduire l'image" : "Agrandir l'image"}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/70 text-white shadow-lg hover:bg-slate-900/90 transition-colors"
          >
            {big ? <><ZoomOut size={14} /> Réduire</> : <><ZoomIn size={14} /> Agrandir</>}
          </button>
        )}
      </div>
    </Card>
  );
}

// Media block above a bank question: audio player and/or illustration.
// Questions without media render nothing (no fake player). `allowReplay`,
// `autoPlay` and `onAudioEnded` drive the exam "test" mode audio behaviour.
//
// Callers must NOT key this per question: keeping the block mounted lets the
// image <img> persist across questions, so the browser swaps its src smoothly
// (it holds the current image until the next is decoded) instead of flickering
// through a blank frame. The audio, which does need a fresh instance each
// question, is keyed by its src here instead.
export function BankQuestionMedia({ question, allowReplay = true, autoPlay = false, onAudioEnded }) {
  // `sign.audio` / `sign.image` tell us the question has media before its signed
  // URL resolves, so the player shell and the image placeholder can render
  // instantly and swap in the src once it lands.
  const hasAudio = !!(question.audio || question.sign?.audio);
  const hasImage = !!(question.image || question.sign?.image);
  if (!hasAudio && !hasImage) return null;
  return (
    <div className="space-y-4">
      {/* Keyed by question identity (stable across the null→URL swap) so the
          audio element is fresh per question but never remounts mid-load. */}
      {hasAudio && <RealAudio key={question.id ?? question.audio} src={question.audio} allowReplay={allowReplay} autoPlay={autoPlay} onEnded={onAudioEnded} />}
      {hasImage && <QuestionImage src={question.image} />}
    </div>
  );
}
