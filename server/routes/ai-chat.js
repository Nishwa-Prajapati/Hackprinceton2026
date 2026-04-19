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
    context.formula && `Chemical equation: ${context.formula}`,
    chemicals && `Chemicals involved: ${chemicals}`,
    context.output && `Product formed: ${context.output}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are an encouraging chemistry tutor inside a virtual science lab. Your responses are spoken aloud to the student via a voice assistant, so always write in plain spoken English — no bullet points, no markdown, no asterisks, no numbered lists.

${contextBlock ? `Current lab context:\n${contextBlock}\n` : ""}Student message:
${question}

How to respond:
- If the student is asking a chemistry question, answer it clearly and completely
- If the student says they don't know something, explain it to them — do not just say "that's okay" and stop
- If the student gives a partial or wrong answer, briefly acknowledge it then give the correct explanation
- Always include at least one real-world use case or interesting fact in your answer
- Use simple language suitable for a curious 14-year-old
- Write 3 to 5 natural spoken sentences — enough to actually answer the question
- Never stop at just an acknowledgment word like "Fantastic" or "Great" — always follow through with the actual answer
- End your response with a natural open invitation like "Do you have any other questions?" or "Want to know more about this?" to keep the conversation going`;
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought)
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

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
          maxOutputTokens: 400,
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
    const details = error.response?.data ?? error.message;
    console.error("[ai-chat] Gemini error:", details);
    response.status(500).json({
      error: "Unable to generate an AI assistant response.",
      details,
    });
  }
});

export default router;
