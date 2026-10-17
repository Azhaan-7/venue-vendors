import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { HirerDocument } from "../entity/HirerDocument";
import { User } from "../entity/User";
import { UserRole } from "../entity/UserRole";
import { vendorCanAccessHirer } from "../auth/authorization";
import { DOCUMENT_TYPES, inspectDocument } from "../security/documents";

export class HirerDocumentController {
    private documentRepository = AppDataSource.getRepository(HirerDocument);
    private userRepository = AppDataSource.getRepository(User);

    async upload(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }
        let inspected: ReturnType<typeof inspectDocument>;
        try { inspected = inspectDocument(request.body); }
        catch (error) { return response.status(400).json({ message: error.message }); }
        const { bytes, ...documentData } = inspected;
        const documentType = inspected.documentType;
        Object.assign(documentData, { hirer: user });

        let document = await this.documentRepository.findOne({
            where: {
                hirer: { id: userId },
                documentType,
            },
            relations: ["hirer"],
        });

        if (!document) {
            document = this.documentRepository.create(documentData);
        } else {
            Object.assign(document, documentData);
        }

        const uploaded = await this.documentRepository.save(document);

        return response.json({
            id: uploaded.id,
            documentType: uploaded.documentType,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            downloadUrl: `/api/hirer-documents/${userId}/${uploaded.documentType}/content`,
            uploadedAt: uploaded.uploadedAt,
        });
    }

    async getByHirer(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const isOwner = request.authUser!.id === userId;
        const isRelatedVendor = request.authUser!.role === UserRole.VENDOR &&
            await vendorCanAccessHirer(request.authUser!.id, userId);
        if (!isOwner && !isRelatedVendor) {
            return response.status(403).json({ message: "You cannot access these documents" });
        }

        const documents = await this.documentRepository.find({
            where: {
                hirer: { id: userId },
            },
            select: { id: true, documentType: true, fileName: true, mimeType: true, uploadedAt: true },
            take: 3,
            order: { id: "ASC" },
        });

        return response.json(documents.map(document => ({
            id: document.id,
            documentType: document.documentType,
            fileName: document.fileName,
            mimeType: document.mimeType,
            downloadUrl: `/api/hirer-documents/${userId}/${document.documentType}/content`,
            uploadedAt: document.uploadedAt,
        })));
    }
    async download(request: Request, response: Response) {
        const userId = Number(request.params.id);
        const documentType = String(request.params.documentType);
        if (!Number.isSafeInteger(userId) || userId < 1 || !DOCUMENT_TYPES.includes(documentType as any)) {
            return response.status(400).json({ message: "Invalid document request" });
        }
        const isOwner = request.authUser!.id === userId;
        if (!isOwner && !(request.authUser!.role === UserRole.VENDOR && await vendorCanAccessHirer(request.authUser!.id, userId))) {
            return response.status(403).json({ message: "You cannot access these documents" });
        }
        const document = await this.documentRepository.findOne({ where: { hirer: { id: userId }, documentType } });
        if (!document) return response.status(404).json({ message: "Document not found" });
        let inspected: ReturnType<typeof inspectDocument>;
        try { inspected = inspectDocument(document); }
        catch { return response.status(422).json({ message: "Stored document needs to be replaced with a valid supported file" }); }
        response.setHeader("Content-Type", inspected.mimeType);
        response.setHeader("Content-Disposition", `attachment; filename="document.${inspected.mimeType === "image/jpeg" ? "jpg" : "pdf"}"`);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        return response.send(inspected.bytes);
    }

    async deleteDocument(request: Request, response: Response) {
        const userId = Number(request.params.id);
        const documentType = String(request.params.documentType);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const document = await this.documentRepository.findOne({
            where: {
                hirer: { id: userId },
                documentType: documentType
            },
            relations: ["hirer"]
        });
        if (!document) {
            return response.status(404).json({ message: "Document not found" });
        }
        await this.documentRepository.remove(document);
        return response.json({ message: "Document deleted successfully" });
    }

}
