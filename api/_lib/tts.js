// Azure Cognitive Services text-to-speech for the AI examiner's voice in the
// oral-interview simulation. Strictly optional decoration: without the Azure
// config, or on any API failure, the dialogue turn simply carries no audio and
// the client falls back to browser speech synthesis — TTS must never break a
// turn.

// fr-CA neural voice (TCF *Canada*). Sylvie is a natural female fr-CA voice;
// swap via AZURE_SPEECH_VOICE (e.g. fr-CA-AntoineNeural, fr-CA-JeanNeural,
// fr-CA-ThierryNeural, or an fr-FR voice like fr-FR-DeniseNeural).
const DEFAULT_VOICE = "fr-CA-SylvieNeural";
export const TTS_MODEL_NAME = "azure-neural-tts";

export function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));
}

// Returns { audio: <base64 mp3>, bytes } or null. 24 kHz 48 kbps mono keeps a
// ~10 s follow-up around 60 KB — negligible next to the recording the client
// just uploaded. The v1 REST endpoint accepts the subscription key directly,
// so there's no token-exchange round trip.
export async function synthesizeFrench(text) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region || !text) return null;
  const voice = process.env.AZURE_SPEECH_VOICE || DEFAULT_VOICE;
  const lang = voice.slice(0, 5); // "fr-CA" / "fr-FR"
  const ssml = `<speak version='1.0' xml:lang='${lang}'><voice name='${voice}'>${xmlEscape(text)}</voice></speak>`;
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "passerelle-tcf",
      },
      body: ssml,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`azure tts (${res.status}):`, detail.slice(0, 200));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? { audio: buf.toString("base64"), bytes: buf.length } : null;
  } catch (err) {
    console.warn("azure tts:", err.message);
    return null;
  }
}
