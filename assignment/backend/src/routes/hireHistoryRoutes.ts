import { positiveId } from "../security/input";
import { Router } from "express";
import { AppDataSource } from "../data-source";
import { HireHistory } from "../entity/HireHistory";
import { pagination } from "../security/input";
import { requireAuth } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});

router.get("/hire-history", requireAuth, async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(HireHistory);

    const user = req.authUser!;
    if (![UserRole.HIRER, UserRole.VENDOR].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
    // A vendor may see history only for hirers who applied to a venue they own.
    const where = user.role === UserRole.HIRER
      ? { hirer: { id: user.id } }
      : { hirer: { applications: { applicationVenues: { venue: { vendor: { id: user.id } } } } } };
    const data = await repo.find({ ...pagination(req), where, relations: ["hirer", "venue"] });

    res.json(data.map(item => ({
      id: item.id,
      hirer: { id: item.hirer.id, email: item.hirer.email },
      venue: { id: item.venue.id, venueName: item.venue.name, location: item.venue.location },
      eventName: item.eventName,
      eventDate: item.eventDate,
      eventTime: item.eventTime,
      durationHours: item.durationHours,
      rating: item.rating,
      documents: item.documents,
    })));
  } catch (error) {
    console.error("Hire history failed; details suppressed");
    res.status(500).json({
      message: "Failed to load hire history",
    });
  }
});

export default router;
