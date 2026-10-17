import { positiveId } from "../security/input";
import { Router } from "express";   
import { BlockedPeriodController } from "../controller/BlockedPeriodController";
import { requireAuth, requireRole } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const controller = new BlockedPeriodController();

router.get("/blocked-periods", requireAuth, (req, res) =>
    controller.getAll(req, res)
);

router.post("/blocked-periods", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    controller.create(req, res)
);  

router.delete("/blocked-periods/:id", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    controller.remove(req, res)
);

export default router;
