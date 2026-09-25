import { Router } from "express";   
import { BlockedPeriodController } from "../controller/BlockedPeriodController";

const router = Router();
const controller = new BlockedPeriodController();

router.get("/blocked-periods", (req, res) =>
    controller.getAll(req, res)
);

router.post("/blocked-periods", (req, res) =>
    controller.create(req, res)
);  

router.delete("/blocked-periods/:id", (req, res) =>
    controller.remove(req, res)
);

export default router;