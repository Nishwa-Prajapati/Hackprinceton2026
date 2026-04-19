import { Router } from "express";

const router = Router();

const DEFAULT_TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";

function ensureApiKey(response) {
  if (!process.env.ELEVENLABS_API_KEY) {
    response.status(500).json({ error: "Missing ELEVENLABS_API_KEY on the server." });
    return false;
  }
  return true;
}

router.post("/", async (request, response) => {
  if (!ensureApiKey(response)) return;

  const text = String(request.body?.text ?? "").trim();
  const voiceId = String(request.body?.voiceId ?? DEFAULT_VOICE_ID).trim();
  const modelId = String(request.body?.modelId ?? DEFAULT_TTS_MODEL).trim();

  if (!text) {
    response.status(400).json({ error: "Text is required for narration." });
    return;
  }

  try {
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.42,
            similarity_boost: 0.78,
          },
        }),
      }
    );

    if (!elevenResponse.ok) {
      const details = await elevenResponse.text();
      response.status(500).json({ error: "ElevenLabs TTS request failed.", details });
      return;
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    response.json({
      audioBase64: audioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      voiceId,
      modelId,
    });
  } catch (error) {
    response.status(500).json({
      error: "Unable to synthesize speech with ElevenLabs.",
      details: error.message,
    });
  }
});

router.post("/transcribe", async (request, response) => {
  if (!ensureApiKey(response)) return;

  const audioBase64 = String(request.body?.audioBase64 ?? "").trim();
  const mimeType = String(request.body?.mimeType ?? "audio/webm").trim();
  const modelId = String(request.body?.modelId ?? DEFAULT_STT_MODEL).trim();

  if (!audioBase64) {
    response.status(400).json({ error: "Audio payload is required for transcription." });
    return;
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const formData = new FormData();
    formData.append("model_id", modelId);
    formData.append("file", new Blob([audioBuffer], { type: mimeType }), `assistant-input.${mimeType.includes("mp4") ? "mp4" : "webm"}`);

    const elevenResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    const payload = await elevenResponse.json();
    if (!elevenResponse.ok) {
      response.status(500).json({ error: "ElevenLabs transcription failed.", details: payload });
      return;
    }

    response.json({
      text: payload.text ?? "",
      languageCode: payload.language_code ?? "",
    });
  } catch (error) {
    response.status(500).json({
      error: "Unable to transcribe speech with ElevenLabs.",
      details: error.message,
    });
  }
});

export default router;
