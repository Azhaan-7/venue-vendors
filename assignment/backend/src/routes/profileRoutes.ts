import { Router } from "express";
import { ProfileController } from "../controller/ProfileController";

const router = Router();
const controller = new ProfileController();

router.put("/profile/:id", (req, res) =>
  controller.update(req, res)
);

router.get("/profile/:id", (req, res) =>
    controller.getProfile(req, res)
);

export default router;