import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { speak } from "@/utils/speech";

// « Écouter » for a word or an expression: the browser's best French voice
// (utils/speech.js — free, offline, no function call). Hearing a word once
// fixes its pronunciation and helps the listening test and the dictée alike.
// Silent, by design, on a browser with no French voice.
// `inline`: rendered as a span (role="button") for use inside another
// button — the flip card — where a nested <button> is invalid HTML.
export function SpeakButton({ text, size = 16, className = "", inline = false }) {
  const { c, t } = useApp();
  const [playing, setPlaying] = useState(false);
  const play = (e) => {
    e.stopPropagation();
    setPlaying(true);
    speak(text, () => setPlaying(false), { prefer: "fr-FR" });
  };
  const props = {
    onClick: play,
    "aria-label": `${t("Écouter")} : ${text}`,
    className: `p-1.5 rounded-lg shrink-0 inline-flex transition-colors ${playing ? "text-blue-600" : `${c.faint} hover:text-blue-600`} ${className}`,
  };
  const icon = <Volume2 size={size} className={playing ? "animate-pulse" : ""} />;
  return inline
    ? <span role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") play(e); }} {...props}>{icon}</span>
    : <button type="button" {...props}>{icon}</button>;
}
