import "dotenv/config";
import cors from "cors";
import express from "express";
import elevenLabsRouter from "./routes/elevenlabs.js";
import geminiRouter from "./routes/gemini.js";
import claudeRouter from "./routes/claude.js";
import reactionsRouter from "./routes/reactions.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Lab Zero server is online" });
});

app.use("/api/reactions", reactionsRouter);
app.use("/api/narrate", elevenLabsRouter);
app.use("/api/iteminfo", geminiRouter);
app.use("/api", claudeRouter);

app.listen(port, () => {
  console.log(`Lab Zero server listening on http://localhost:${port}`);
});
