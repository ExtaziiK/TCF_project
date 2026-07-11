import { useEffect, useState } from "react";
import { Card } from "@/components/common";
import { RealAudio } from "@/components/quiz/RealAudio";

// Illustration for a question. Many questions carry a convention-based image
// URL that doesn't actually exist (e.g. Compréhension orale, which is audio
// only), so we keep the frame hidden until the image successfully loads —
// otherwise an empty box would flash in and out on every question. The <img>
// still loads while hidden (display:none), so onLoad/onError fire normally.
function QuestionImage({ src }) {
  const [status, setStatus] = useState("loading"); // loading | loaded | failed
  useEffect(() => setStatus("loading"), [src]);
  if (status === "failed") return null;
  return (
    <Card className={status === "loaded" ? "p-4 flex justify-center" : "hidden"}>
      <img
        src={src}
        alt="Illustration de la question"
        className="max-h-64 rounded-2xl object-contain"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
    </Card>
  );
}

// Media block above a bank question: audio player and/or illustration.
// Questions without media render nothing (no fake player).
export function BankQuestionMedia({ question }) {
  if (!question.audio && !question.image) return null;
  return (
    <div className="space-y-4">
      {question.audio && <RealAudio src={question.audio} />}
      {question.image && <QuestionImage src={question.image} />}
    </div>
  );
}
