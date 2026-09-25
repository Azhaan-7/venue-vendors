import { Router } from "express";
import { VenueController } from "../controller/VenueController";

const router = Router();
const venueController = new VenueController();

router.get("/venues", (req, res) =>
    venueController.getAll(req, res)
);

router.get("/venues/vendor/:vendorId",(req, res) =>
    venueController.getByVendor(req, res)
)

router.post("/venues", (req, res) =>
    venueController.createVenue(req, res)
);

router.put("/venues/:id", (req, res) =>
    venueController.updateVenue(req, res)
);

router.delete("/venues/:id", (req, res) =>
    venueController.deleteVenue(req, res)
);

export default router;