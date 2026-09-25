import { Router } from "express";
import { HirerDocumentController } from "../controller/HirerDocumentController";

const router = Router();
const hirerDocumentController = new HirerDocumentController();

router.post("/hirer-documents/:id", (req, res) =>
    hirerDocumentController.upload(req, res)
);

router.get("/hirer-documents/:id", (req, res) =>
    hirerDocumentController.getByHirer(req, res)
);

router.delete("/hirer-documents/:id/:documentType", (req, res) =>
    hirerDocumentController.deleteDocument(req, res)
);
export default router;