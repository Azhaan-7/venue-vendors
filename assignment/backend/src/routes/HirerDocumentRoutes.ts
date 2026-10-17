import { positiveId } from "../security/input";
import { Router } from "express";
import { HirerDocumentController } from "../controller/HirerDocumentController";
import { requireAuth, requireOwnParam, requireRole } from "../middleware/auth";
import { UserRole } from "../entity/UserRole";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const hirerDocumentController = new HirerDocumentController();

router.post("/hirer-documents/:id", requireAuth, requireRole(UserRole.HIRER), requireOwnParam("id"), (req, res) =>
    hirerDocumentController.upload(req, res)
);

router.get("/hirer-documents/:id", requireAuth, (req, res) =>
    hirerDocumentController.getByHirer(req, res)
);

router.get("/hirer-documents/:id/:documentType/content", requireAuth, (req, res) =>
    hirerDocumentController.download(req, res)
);

router.delete("/hirer-documents/:id/:documentType", requireAuth, requireRole(UserRole.HIRER), requireOwnParam("id"), (req, res) =>
    hirerDocumentController.deleteDocument(req, res)
);
export default router;
