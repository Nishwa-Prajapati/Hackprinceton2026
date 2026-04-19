import axios from "axios";
import { Router } from "express";

const router = Router();

function buildPrompt(question, context = {}) {
  const chemicals = Array.isArray(context.chemicals)
    ? context.chemicals.filter(Boolean).join(", ")
    : "";

  const contextBlock = [
    context.desk && `Lab desk: ${context.desk}`,
    context.reaction && `Reaction being studied: ${context.reaction}`,
    chemicals && `Chemicals involved: ${chemicals}`,
    context.output && `Product formed: ${context.output}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are an encouraging chemistry tutor inside a virtual science lab. Your responses are spoken aloud to the student, so write exactly as you would speak — no bullet points, no markdown, no numbered lists, no asterisks.

${contextBlock ? `Current lab context:\n${contextBlock}\n` : ""}Student question:
${question}

Rules for your answer:
- Speak naturally in 2 to 3 short sentences, as if talking to a curious 14-year-old
- Keep the total response under 60 words so it sounds great when read aloud
- Give at least one real-world example or surprising fact
- Never use lists, headers, or special characters — only plain spoken sentences
- If the student gave a wrong answer, gently correct it first, then explain the right idea`;
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part?.text ?? "")
    .join(" ")
    .trim();
}

router.post("/", async (request, response) => {
  const { question, context = {} } = request.body ?? {};
  const trimmedQuestion = String(question ?? "").trim();

  if (!trimmedQuestion) {
    response.status(400).json({ error: "Question is required." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    response.status(500).json({ error: "Missing GEMINI_API_KEY on the server." });
    return;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: buildPrompt(trimmedQuestion, context) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.88,
          maxOutputTokens: 160,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        timeout: 20000,
      }
    );

    const answer = extractText(geminiResponse.data);
    if (!answer) {
      throw new Error("Gemini returned an empty response.");
    }

    response.json({ answer });
  } catch (error) {
    response.status(500).json({
      error: "Unable to generate an AI assistant response.",
      details: error.response?.data ?? error.message,
    });
  }
});

export default router;
