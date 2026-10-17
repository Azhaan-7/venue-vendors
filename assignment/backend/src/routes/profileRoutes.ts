import { positiveId } from "../security/input";
import { Router } from "express";
import { ProfileController } from "../controller/ProfileController";
import { requireAuth, requireOwnParam } from "../middleware/auth";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const controller = new ProfileController();

router.put("/profile/:id", requireAuth, requireOwnParam("id"), (req, res) =>
  controller.update(req, res)
);

router.get("/profile/:id", requireAuth, (req, res) =>
    controller.getProfile(req, res)
);

export default router;
