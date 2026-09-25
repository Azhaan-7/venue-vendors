import { Router } from "express";
import { ApplicationController } from "../controller/ApplicationController";

const router = Router();
const applicationController = new ApplicationController();

router.post("/applications", (req, res) =>
  applicationController.createApplication(req, res)
);

router.get("/applications/hirer/:hirerId", (req, res) =>
  applicationController.hirerApplications(req, res)
);

router.get("/applications", (req, res) =>
    applicationController.getAll(req, res)
);

router.put("/applications/:id/approve", (req, res) =>
    applicationController.approveApplication(req, res)
);  

router.put("/applications/:id/reject", (req, res) =>
    applicationController.rejectApplication(req, res)
); 

router.put("/applications/:id/comment", (req, res) =>
    applicationController.updateComment(req, res)
);

router.get("/applications/vendor/:vendorId", (req, res) =>
    applicationController.getVendorApplications(req, res)
);

router.get("/applications/vendor/:vendorId/stats", (req, res) =>
    applicationController.getVendorStats(req, res)
);

export default router;