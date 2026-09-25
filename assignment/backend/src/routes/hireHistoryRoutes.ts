import { Router } from "express";
import { AppDataSource } from "../data-source";
import { HireHistory } from "../entity/HireHistory";

const router = Router();

router.get("/hire-history", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(HireHistory);

    const data = await repo.find({relations: ["hirer", "venue"]});

    res.json(data);
  } catch (error) {
    console.error("Hire history error:", error);
    res.status(500).json({
      message: "Failed to load hire history",
      error: error.message,
    });
  }
});

export default router;