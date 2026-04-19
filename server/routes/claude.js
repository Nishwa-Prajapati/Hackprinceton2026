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

  return `You are an encouraging chemistry tutor inside a virtual science lab. Your responses are spoken aloud via a voice assistant, so write in plain spoken English only — no bullet points, no markdown, no asterisks, no numbered lists.

${contextBlock ? `Current lab context:\n${contextBlock}\n` : ""}Student message:
${question}

Rules:
- If the student says no or does not know, explain the reaction and give 2 to 3 real-world uses of the product
- Always follow through with the actual answer — never just acknowledge and stop
- Use simple language for a curious 14-year-old
- Write 3 to 5 natural spoken sentences
- End with a natural invitation like "Do you have any other questions?"`;
}

router.post("/explain", async (req, res) => {
  const { question, context = {} } = req.body ?? {};
  const trimmed = String(question ?? "").trim();

  if (!trimmed) {
    res.status(400).json({ error: "Question is required." });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY not configured — client should use fallback." });
    return;
  }

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 350,
        messages: [{ role: "user", content: buildPrompt(trimmed, context) }],
      }),
    });

    const payload = await claudeRes.json();

    if (!claudeRes.ok) {
      console.error("[claude] API error:", payload);
      res.status(500).json({ error: "Claude API request failed.", details: payload });
      return;
    }

    const answer = String(payload.content?.[0]?.text ?? "").trim();
    if (!answer) throw new Error("Empty Claude response.");

    res.json({ answer });
  } catch (error) {
    console.error("[claude] Error:", error.message);
    res.status(500).json({ error: "Claude request failed.", details: error.message });
  }
});

router.post("/portfolio", async (_req, res) => {
  res.json({ ok: true });
});

export default router;
