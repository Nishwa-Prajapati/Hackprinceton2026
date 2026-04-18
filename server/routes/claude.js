import { Router } from "express";

const router = Router();

router.post("/explain", async (req, res) => {
  res.json({ ok: true });
});

router.post("/portfolio", async (req, res) => {
  res.json({ ok: true });
});

export default router;
