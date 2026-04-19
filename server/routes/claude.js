import { Router } from "express";

const router = Router();

// ─── /explain ────────────────────────────────────────────────────────────────

function buildExplainPrompt(question, context = {}) {
  const chemicals = Array.isArray(context.chemicals)
    ? context.chemicals.filter(Boolean).join(", ")
    : "";

  const contextBlock = [
    context.desk     && `Lab desk: ${context.desk}`,
    context.reaction && `Reaction being studied: ${context.reaction}`,
    context.formula  && `Chemical equation: ${context.formula}`,
    chemicals        && `Chemicals involved: ${chemicals}`,
    context.output   && `Product formed: ${context.output}`,
  ].filter(Boolean).join("\n");

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
  if (!trimmed) { res.status(400).json({ error: "Question is required." }); return; }

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
        messages: [{ role: "user", content: buildExplainPrompt(trimmed, context) }],
      }),
    });

    const payload = await claudeRes.json();
    if (!claudeRes.ok) { res.status(500).json({ error: "Claude API error.", details: payload }); return; }

    const answer = String(payload.content?.[0]?.text ?? "").trim();
    if (!answer) throw new Error("Empty Claude response.");
    res.json({ answer });
  } catch (err) {
    console.error("[claude/explain]", err.message);
    res.status(500).json({ error: "Claude request failed.", details: err.message });
  }
});

// ─── /quiz ────────────────────────────────────────────────────────────────────

const FALLBACK_QUESTIONS = {
  sodium: [
    { q: "What are the two products when sodium metal reacts with water?", options: ["Sodium chloride and oxygen", "Sodium hydroxide and hydrogen gas", "Sodium oxide and steam", "Sodium carbonate and water"], correct: 1, explanation: "2Na + 2H₂O → 2NaOH + H₂↑. The products are sodium hydroxide (a strong base) and hydrogen gas." },
    { q: "Why does sodium float on the surface of water during the reaction?", options: ["It is repelled magnetically by water", "Its density is lower than water", "The hydrogen gas lifts it upward", "It bonds to oxygen atoms at the surface"], correct: 1, explanation: "Sodium has a density of about 0.97 g/cm³, which is slightly less than water (1.0 g/cm³), so it floats." },
    { q: "Where is sodium hydroxide (NaOH) used in everyday life?", options: ["As rocket fuel", "In soap making and drain cleaners", "As a food preservative in canned goods", "In photography film development"], correct: 1, explanation: "NaOH (lye) is essential in soap manufacturing and is the active ingredient in most powerful drain cleaners." },
    { q: "Why must sodium metal be stored in mineral oil?", options: ["To keep it at a constant temperature", "To prevent it from reacting with air moisture", "To improve its electrical conductivity", "To stop it from turning black"], correct: 1, explanation: "Sodium reacts violently with water vapour in air, so it is stored submerged in mineral oil to isolate it from moisture." },
    { q: "The hydrogen gas released in the sodium-water reaction can ignite because:", options: ["Sodium is radioactive and emits sparks", "The reaction releases enough heat to ignite the hydrogen", "Water contains dissolved oxygen that feeds the flame", "Sodium hydroxide is itself flammable"], correct: 1, explanation: "The reaction is strongly exothermic. The heat produced is often enough to ignite the hydrogen gas immediately upon release." },
  ],
  acidbase: [
    { q: "What type of reaction occurs when HCl reacts with NaOH?", options: ["Combustion reaction", "Displacement reaction", "Neutralization reaction", "Decomposition reaction"], correct: 2, explanation: "An acid reacting with a base to form salt and water is called a neutralization reaction." },
    { q: "What are the products when hydrochloric acid neutralizes sodium hydroxide?", options: ["Sodium carbonate and water", "Sodium chloride and water", "Sodium oxide and hydrogen", "Chlorine gas and sodium hydroxide"], correct: 1, explanation: "HCl + NaOH → NaCl + H₂O. The products are common salt (sodium chloride) and water." },
    { q: "A neutralization reaction in everyday life occurs when you:", options: ["Burn wood in a fireplace", "Take an antacid tablet for heartburn", "Electroplate a metal object", "Dissolve sugar in tea"], correct: 1, explanation: "Antacid tablets contain a base (like calcium carbonate) that neutralizes excess hydrochloric acid in your stomach." },
    { q: "What does a pH of 7 indicate about a solution?", options: ["Strongly acidic", "Strongly basic", "Neutral", "Slightly acidic"], correct: 2, explanation: "pH 7 is neutral — neither acidic nor basic. Pure water has a pH of 7." },
    { q: "Which indicator would turn red when added to hydrochloric acid?", options: ["Universal indicator (turns green)", "Litmus paper (turns red)", "Phenolphthalein (turns pink)", "Methyl orange (turns yellow)"], correct: 1, explanation: "Litmus paper turns red in acidic solutions and blue in basic solutions — it is one of the most common acid-base indicators." },
  ],
  copper: [
    { q: "Why does zinc displace copper from copper sulphate solution?", options: ["Zinc is heavier than copper", "Zinc is higher in the reactivity series than copper", "Copper sulphate is attracted to zinc magnetically", "Zinc has a lower melting point"], correct: 1, explanation: "A more reactive metal displaces a less reactive metal from its salt solution. Zinc is more reactive than copper." },
    { q: "What colour change do you observe when zinc is added to blue copper sulphate solution?", options: ["Blue to yellow", "Blue to colourless as copper deposits on zinc", "Colourless to red", "No colour change occurs"], correct: 1, explanation: "As zinc displaces copper ions from solution, the blue colour fades and copper metal (reddish-brown) deposits on the zinc." },
    { q: "Which real-world process uses the principle of metal displacement?", options: ["Distillation of water", "Electroplating jewellery", "Making glass", "Baking bread"], correct: 1, explanation: "Electroplating uses displacement principles to coat an object with a thin layer of a more desirable metal, such as gold or silver." },
    { q: "What is the word equation for zinc reacting with copper sulphate?", options: ["Zinc sulphate + Copper → Copper sulphate + Zinc", "Zinc + Copper sulphate → Zinc sulphate + Copper", "Zinc oxide + Copper → Zinc + Copper oxide", "Copper + Zinc sulphate → Copper sulphate + Zinc"], correct: 1, explanation: "Zinc replaces copper in the compound: Zinc + Copper sulphate → Zinc sulphate + Copper." },
    { q: "Which metal would NOT be displaced by zinc from its salt solution?", options: ["Copper", "Iron", "Magnesium", "Lead"], correct: 2, explanation: "Magnesium is higher than zinc in the reactivity series, so zinc cannot displace magnesium from its salts." },
  ],
  combustion: [
    { q: "What are the products of complete combustion of ethanol?", options: ["Carbon monoxide and water", "Carbon dioxide and water", "Carbon and hydrogen gas", "Ethanoic acid and oxygen"], correct: 1, explanation: "C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O. Complete combustion of ethanol produces carbon dioxide and water." },
    { q: "Ethanol is used as a biofuel because:", options: ["It burns without producing any gases", "It is made from plants and burns cleanly enough to blend with petrol", "It makes engines run more loudly", "It is cheaper than water"], correct: 1, explanation: "Ethanol is produced by fermenting crops like sugarcane. Many countries blend it with petrol (E10, E85) to reduce fossil fuel use." },
    { q: "Why is ethanol used in hand sanitizers?", options: ["It moisturises the skin", "It denatures and kills bacteria by dissolving their membranes", "It smells pleasant and covers bacteria", "It creates a physical barrier on skin"], correct: 1, explanation: "Ethanol is an effective disinfectant because it denatures (unfolds and destroys) proteins in bacterial cell walls." },
    { q: "What does 'complete combustion' require compared to 'incomplete combustion'?", options: ["Less oxygen and more fuel", "A sufficient supply of oxygen", "A lower temperature", "The presence of a catalyst"], correct: 1, explanation: "Complete combustion requires an adequate oxygen supply. Without enough oxygen, incomplete combustion produces carbon monoxide (CO) instead of CO₂." },
    { q: "If ethanol combustion is incomplete, which toxic gas is produced?", options: ["Carbon dioxide", "Carbon monoxide", "Nitrogen dioxide", "Sulphur dioxide"], correct: 1, explanation: "Incomplete combustion of any carbon-containing fuel produces carbon monoxide (CO), a colourless, odourless, and toxic gas." },
  ],
};

function getFallbackQuestions(context) {
  const combined = `${context?.reaction ?? ""} ${context?.output ?? ""} ${(context?.chemicals ?? []).join(" ")}`.toLowerCase();
  if (/sodium|na\b/.test(combined) && /water|h2o/.test(combined)) return FALLBACK_QUESTIONS.sodium;
  if (/hcl|hydrochloric|neutrali|acid.*base/.test(combined) || (/hcl/.test(combined) && /naoh/.test(combined))) return FALLBACK_QUESTIONS.acidbase;
  if (/copper|cuso4|zinc|displacement/.test(combined)) return FALLBACK_QUESTIONS.copper;
  if (/ethanol|combustion|burn/.test(combined)) return FALLBACK_QUESTIONS.combustion;

  // Generic fallback — works for any unlisted reaction
  const output = context?.output || "the product";
  const reaction = context?.reaction || "this reaction";
  return [
    { q: `Which type of chemical change best describes ${reaction}?`, options: ["Physical change — only appearance changes", "Chemical change — new substances are formed", "Nuclear change — atoms are split", "No change occurs"], correct: 1, explanation: "A chemical reaction always produces new substances with different properties from the starting materials." },
    { q: `What evidence shows that a chemical reaction has taken place?`, options: ["The temperature always drops", "Colour change, gas production, or precipitate formation", "The mass doubles", "Nothing observable happens"], correct: 1, explanation: "Observable signs of a chemical reaction include colour change, gas bubbles, precipitate forming, or a temperature change." },
    { q: `Where might ${output} be useful in everyday life?`, options: ["As a household decoration only", "In industrial manufacturing and consumer products", "Only in outer space applications", "It has no practical uses"], correct: 1, explanation: `${output} is the result of a real chemical process and has applications in industry, medicine, or everyday products.` },
    { q: `Why is it important to know the products of a chemical reaction?`, options: ["Only for aesthetic reasons", "To predict properties, safety hazards, and real-world uses", "To win chemistry spelling bees", "Products never matter, only reactants do"], correct: 1, explanation: "Knowing products lets chemists predict safety risks (e.g. toxic gases), industrial applications, and how to handle materials properly." },
    { q: `What does the Law of Conservation of Mass state about chemical reactions?`, options: ["Mass is always lost during reactions", "Total mass of reactants equals total mass of products", "Energy is converted into mass", "Only liquids conserve mass"], correct: 1, explanation: "Atoms are rearranged but not created or destroyed, so the total mass before and after a reaction stays the same." },
  ];
}

function buildQuizPrompt(context) {
  const combined = [
    context.reaction && `Reaction: ${context.reaction}`,
    context.formula  && `Equation: ${context.formula}`,
    context.output   && `Product: ${context.output}`,
    (context.chemicals ?? []).length && `Chemicals: ${context.chemicals.join(", ")}`,
  ].filter(Boolean).join("\n");

  return `Generate exactly 5 multiple-choice quiz questions about the following chemistry topic for a 14-year-old student.

Topic:
${combined}

Return ONLY valid JSON — no explanation, no markdown, no extra text — in this exact shape:
{"questions":[{"q":"question text","options":["A","B","C","D"],"correct":0,"explanation":"one sentence explaining the correct answer"}]}

Rules:
- correct is the 0-based index of the correct option
- Cover: reaction mechanism, products, real-world applications, safety, properties — one concept per question
- No two questions may test the same concept
- Each question must have exactly 4 options
- Keep language simple and clear`;
}

router.post("/quiz", async (req, res) => {
  const { context = {} } = req.body ?? {};

  if (!process.env.ANTHROPIC_API_KEY) {
    res.json({ questions: getFallbackQuestions(context), source: "fallback" });
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
        max_tokens: 1200,
        messages: [{ role: "user", content: buildQuizPrompt(context) }],
      }),
    });

    const payload = await claudeRes.json();
    if (!claudeRes.ok) throw new Error(JSON.stringify(payload));

    const raw = String(payload.content?.[0]?.text ?? "").trim();
    // Extract JSON even if Claude wraps it in markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Claude response.");

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length < 3) throw new Error("Too few questions returned.");

    res.json({ questions: questions.slice(0, 5), source: "claude" });
  } catch (err) {
    console.error("[claude/quiz] Falling back:", err.message);
    res.json({ questions: getFallbackQuestions(context), source: "fallback" });
  }
});

router.post("/portfolio", async (_req, res) => {
  res.json({ ok: true });
});

export default router;
