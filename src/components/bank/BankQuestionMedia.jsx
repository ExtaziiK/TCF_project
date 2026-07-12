import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Card } from "@/components/common";
import { RealAudio } from "@/components/quiz/RealAudio";
import { isImagePreloaded, markImagePreloaded } from "@/utils/imagePreload";

// Illustration for a question. Many questions carry a convention-based image
// URL that doesn't actually exist (e.g. Compréhension orale, which is audio
// only), so we keep the frame hidden until the image successfully loads —
// otherwise an empty box would flash in and out on every question. The <img>
// still loads while hidden (display:none), so onLoad/onError fire normally.
// Images prefetched by the quiz (see utils/imagePreload) start "loaded" so
// they appear instantly on navigation, with no load flash or layout shift.
// The "Agrandir" magnifier enlarges the document in place (it grows to the
// full column width) rather than in a full-screen overlay, so the question
// and answers below stay visible while the fine print is readable.
function QuestionImage({ src }) {
  const [status, setStatus] = useState(() => (isImagePreloaded(src) ? "loaded" : "loading")); // loading | loaded | failed
  const [big, setBig] = useState(false);
  useEffect(() => { setStatus(isImagePreloaded(src) ? "loaded" : "loading"); setBig(false); }, [src]);
  if (status === "failed") return null;
  return (
    <Card className={status === "loaded" ? "p-4" : "hidden"}>
      <div className="relative">
        <img
          src={src}
          alt="Illustration de la question"
          className={`rounded-2xl object-contain mx-auto transition-all duration-300 ${big ? "w-full max-h-[80vh]" : "max-h-80 md:max-h-96"}`}
          onLoad={() => { markImagePreloaded(src); setStatus("loaded"); }}
          onError={() => setStatus("failed")}
        />
        <button
          type="button"
          onClick={() => setBig((v) => !v)}
          aria-label={big ? "Réduire l'image" : "Agrandir l'image"}
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/70 text-white shadow-lg hover:bg-slate-900/90 transition-colors"
        >
          {big ? <><ZoomOut size={14} /> Réduire</> : <><ZoomIn size={14} /> Agrandir</>}
        </button>
      </div>
    </Card>
  );
}

// Media block above a bank question: audio player and/or illustration.
// Questions without media render nothing (no fake player). `allowReplay`,
// `autoPlay` and `onAudioEnded` drive the exam "test" mode audio behaviour.
export function BankQuestionMedia({ question, allowReplay = true, autoPlay = false, onAudioEnded }) {
  if (!question.audio && !question.image) return null;
  return (
    <div className="space-y-4">
      {question.audio && <RealAudio src={question.audio} allowReplay={allowReplay} autoPlay={autoPlay} onEnded={onAudioEnded} />}
      {question.image && <QuestionImage src={question.image} />}
    </div>
  );
}
