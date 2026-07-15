// ElevenLabs text-to-speech for the AI examiner's voice in the oral-interview
// simulation. Strictly optional decoration: without ELEVENLABS_API_KEY, or on
// any API failure, the dialogue turn simply carries no audio and the client
// falls back to browser speech synthesis — TTS must never break a turn.

const DEFAULT_VOICE_ID = "5l4ttmr4SKNgi0HnOelT"; // French voice picked for the examiner
// turbo v2.5: solid French, ~half the credits of eleven_multilingual_v2 and
// low latency; bump to multilingual_v2 if voice quality ever needs a step up.
export const TTS_MODEL_NAME = "eleven_turbo_v2_5";

// Returns { audio: <base64 mp3>, bytes } or null. 32 kbps mono keeps a ~10 s
// follow-up around 40 KB (~55 KB base64) — negligible next to the recording
// the client just uploaded.
export async function synthesizeFrench(text) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: TTS_MODEL_NAME, language_code: "fr" }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`elevenlabs tts (${res.status}):`, detail.slice(0, 200));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? { audio: buf.toString("base64"), bytes: buf.length } : null;
  } catch (err) {
    console.warn("elevenlabs tts:", err.message);
    return null;
  }
}
