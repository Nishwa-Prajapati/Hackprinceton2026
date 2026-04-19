import { Router } from "express";
import { loadReactions } from "../services/loadReactions.js";

const router = Router();

router.get("/", async (_request, response) => {
  try {
    const reactions = await loadReactions();
    response.json({
      count: reactions.length,
      reactions
    });
  } catch (error) {
    response.status(500).json({
      error: "Unable to load reactions",
      details: error.message
    });
  }
});

router.get("/phase-1", async (_request, response) => {
  try {
    const reactions = await loadReactions();
    response.json({
      reactions: reactions.filter((reaction) => reaction.phase === 1)
    });
  } catch (error) {
    response.status(500).json({
      error: "Unable to load Phase 1 reactions",
      details: error.message
    });
  }
});

export default router;
