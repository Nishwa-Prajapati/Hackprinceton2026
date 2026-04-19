import { Router } from "express";
import { loadAllDesks, loadDeskById, listDeskIds } from "../services/loadDesks.js";

const router = Router();

// GET /api/desks  →  list of desk metadata (no chemicals/reactions)
router.get("/", async (_req, res) => {
  try {
    const all = await loadAllDesks();
    const summary = Object.values(all).map(({ desk }) => desk);
    res.json({ count: summary.length, desks: summary });
  } catch (err) {
    res.status(500).json({ error: "Unable to load desks", details: err.message });
  }
});

// GET /api/desks/:deskId  →  full desk (chemicals + apparatus + reactions)
router.get("/:deskId", async (req, res) => {
  try {
    const data = await loadDeskById(req.params.deskId);
    if (!data) {
      return res.status(404).json({
        error: "Desk not found",
        validIds: listDeskIds(),
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Unable to load desk", details: err.message });
  }
});

// GET /api/desks/:deskId/chemicals  →  just the chemicals array
router.get("/:deskId/chemicals", async (req, res) => {
  try {
    const data = await loadDeskById(req.params.deskId);
    if (!data) return res.status(404).json({ error: "Desk not found" });
    res.json({ chemicals: data.chemicals });
  } catch (err) {
    res.status(500).json({ error: "Unable to load chemicals", details: err.message });
  }
});

// GET /api/desks/:deskId/reactions  →  just the reactions array
router.get("/:deskId/reactions", async (req, res) => {
  try {
    const data = await loadDeskById(req.params.deskId);
    if (!data) return res.status(404).json({ error: "Desk not found" });
    res.json({ reactions: data.reactions });
  } catch (err) {
    res.status(500).json({ error: "Unable to load reactions", details: err.message });
  }
});

// POST /api/desks/:deskId/lookup  →  find a reaction by reactant IDs
// Body: { reactants: [id1, id2] }
router.post("/:deskId/lookup", async (req, res) => {
  try {
    const data = await loadDeskById(req.params.deskId);
    if (!data) return res.status(404).json({ error: "Desk not found" });

    const { reactants } = req.body;
    if (!Array.isArray(reactants) || reactants.length < 2) {
      return res.status(400).json({ error: "Provide at least 2 reactant IDs" });
    }

    const sorted = [...reactants].sort();
    const match = data.reactions.find((rxn) => {
      const rxnSorted = [...rxn.reactants].sort();
      return (
        rxnSorted.length === sorted.length &&
        rxnSorted.every((v, i) => String(v) === String(sorted[i]))
      );
    });

    if (!match) {
      return res.json({ found: false, reaction: null });
    }
    res.json({ found: true, reaction: match });
  } catch (err) {
    res.status(500).json({ error: "Lookup failed", details: err.message });
  }
});

export default router;
