import { positiveId } from "../security/input";
import { Router } from "express";
import { ApplicationDraftController } from "../controller/ApplicationDraftController";
import { requireAuth, requireOwnParam, requireRole } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const controller = new ApplicationDraftController();

router.use(requireAuth, requireRole(UserRole.HIRER));

router.get("/application-drafts/:hirerId", requireOwnParam("hirerId"), (req, res) =>
    controller.getByHirer(req, res)
);

router.put("/application-drafts/:hirerId", requireOwnParam("hirerId"), (req, res) =>
    controller.saveForHirer(req, res)
);

router.delete("/application-drafts/:hirerId", requireOwnParam("hirerId"), (req, res) =>
    controller.removeForHirer(req, res)
);

export default router;
