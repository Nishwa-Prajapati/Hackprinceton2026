import cors from "cors";
import express from "express";
import reactionsRouter from "./routes/reactions.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    message: "Lab Zero server is online"
  });
});

app.use("/api/reactions", reactionsRouter);

app.post("/api/proxy/narration", (request, response) => {
  const { zone = "B", outcome = "pending" } = request.body ?? {};

  response.json({
    zone,
    outcome,
    prompt: `Narration placeholder for Zone ${zone} with outcome "${outcome}".`
  });
});

app.listen(port, () => {
  console.log(`Lab Zero server listening on http://localhost:${port}`);
});
