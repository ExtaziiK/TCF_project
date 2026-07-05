import { FakeAudio } from "@/components/quiz/FakeAudio";
import { RealAudio } from "@/components/quiz/RealAudio";

export function AudioPlayer({ src }) {
  return src ? <RealAudio src={src} /> : <FakeAudio />;
}
