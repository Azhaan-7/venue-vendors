import { positiveId } from "../security/input";
import { Router } from "express";
import { ApplicationController } from "../controller/ApplicationController";
import { requireAuth, requireOwnParam, requireRole } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const applicationController = new ApplicationController();

router.post("/applications", requireAuth, requireRole(UserRole.HIRER), (req, res) =>
  applicationController.createApplication(req, res)
);

router.get("/applications/hirer/:hirerId", requireAuth, requireRole(UserRole.HIRER), requireOwnParam("hirerId"), (req, res) =>
  applicationController.hirerApplications(req, res)
);

router.get("/applications", requireAuth, requireRole(UserRole.ADMIN), (req, res) =>
    applicationController.getAll(req, res)
);

router.put("/applications/:id/approve", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    applicationController.approveApplication(req, res)
);  

router.put("/applications/:id/reject", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    applicationController.rejectApplication(req, res)
); 

router.put("/applications/:id/comment", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    applicationController.updateComment(req, res)
);

router.get("/applications/vendor/:vendorId", requireAuth, requireRole(UserRole.VENDOR), requireOwnParam("vendorId"), (req, res) =>
    applicationController.getVendorApplications(req, res)
);

router.get("/applications/vendor/:vendorId/stats", requireAuth, requireRole(UserRole.VENDOR), requireOwnParam("vendorId"), (req, res) =>
    applicationController.getVendorStats(req, res)
);

export default router;
