import { Router } from "express";
import { ApplicationDraftController } from "../controller/ApplicationDraftController";

const router = Router();
const controller = new ApplicationDraftController();

router.get("/application-drafts/:hirerId", (req, res) =>
    controller.getByHirer(req, res)
);

router.put("/application-drafts/:hirerId", (req, res) =>
    controller.saveForHirer(req, res)
);

router.delete("/application-drafts/:hirerId", (req, res) =>
    controller.removeForHirer(req, res)
);

export default router;