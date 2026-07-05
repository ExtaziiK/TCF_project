import { useEffect, useState } from "react";
import { Card } from "@/components/common";
import { RealAudio } from "@/components/quiz/RealAudio";

// Illustration that removes itself if the file can't be loaded (e.g. a
// remote URL that is no longer served) instead of showing a broken image.
function QuestionImage({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return null;
  return (
    <Card className="p-4 flex justify-center">
      <img src={src} alt="Illustration de la question" className="max-h-64 rounded-2xl object-contain" onError={() => setFailed(true)} />
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
