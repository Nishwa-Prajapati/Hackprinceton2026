import axios from "axios";
import { Router } from "express";

const router = Router();

const SYSTEM_INSTRUCTION = `You are a voice assistant inside a virtual chemistry lab for students. Your answers are spoken aloud — never written on screen. This means you must NEVER use bullet points, numbered lists, headers, bold text, asterisks, or any markdown formatting of any kind. If you use any of those, the student will hear symbols read aloud, which sounds broken.

Rules you must follow without exception:
- Respond in 2 to 3 plain spoken sentences only
- Keep the total answer under 50 words
- Mention one specific real-world use or surprising fact
- Use simple conversational language a 14-year-old would understand
- Never use lists or formatting — only natural flowing sentences
- Never open with filler words like "Certainly!" or "Great question!"`;

function buildUserMessage(question, context = {}) {
  const chemicals = Array.isArray(context.chemicals)
    ? context.chemicals.filter(Boolean).join(", ")
    : "";

  const contextLines = [
    context.desk && `Lab: ${context.desk}`,
    context.reaction && `Reaction: ${context.reaction}`,
    chemicals && `Chemicals: ${chemicals}`,
    context.output && `Product: ${context.output}`,
  ].filter(Boolean);

  const contextBlock = contextLines.length
    ? `Context: ${contextLines.join(" | ")}\n`
    : "";

  return `${contextBlock}Student: ${question}`;
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part?.text ?? "").join(" ").trim();
}

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
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
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserMessage(trimmedQuestion, context) }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.85,
          maxOutputTokens: 120,
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

    const raw = extractText(geminiResponse.data);
    if (!raw) {
      throw new Error("Gemini returned an empty response.");
    }

    response.json({ answer: stripMarkdown(raw) });
  } catch (error) {
    const details = error.response?.data ?? error.message;
    console.error('[ai-chat] Gemini error:', JSON.stringify(details, null, 2));
    response.status(500).json({
      error: "Unable to generate an AI assistant response.",
      details,
    });
  }
});

export default router;
