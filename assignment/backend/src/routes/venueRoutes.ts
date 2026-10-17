import { positiveId } from "../security/input";
import { Router } from "express";
import { VenueController } from "../controller/VenueController";
import { requireAuth, requireOwnParam, requireRole } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const venueController = new VenueController();

router.get("/venues", (req, res) =>
    venueController.getAll(req, res)
);

router.get("/venues/vendor/:vendorId", requireAuth, requireRole(UserRole.VENDOR), requireOwnParam("vendorId"), (req, res) =>
    venueController.getByVendor(req, res)
)

router.post("/venues", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    venueController.createVenue(req, res)
);

router.put("/venues/:id", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    venueController.updateVenue(req, res)
);

router.delete("/venues/:id", requireAuth, requireRole(UserRole.VENDOR), (req, res) =>
    venueController.deleteVenue(req, res)
);

export default router;
