import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { HirerDocument } from "../entity/HirerDocument";
import { User } from "../entity/User";

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
        const documentType = String(request.body.documentType || "").trim();
        const fileName = String(request.body.fileName || "").trim();
        const mimeType = String(request.body.mimeType || "").trim();
        const fileData = String(request.body.fileData || "");

        const allowedDocumentTypes = [
            "driverLicense",
            "publicLiabilityInsurance",
            "businessRegistration",
        ];

        if (!documentType) {
            return response.status(400).json({ message: "Document type is required" });
        }
        if (!allowedDocumentTypes.includes(documentType)) {
            return response.status(400).json({ message: "Invalid document type" });
        }
        if (!fileName) {
            return response.status(400).json({ message: "File name is required" });
        }
        if (!mimeType) {
            return response.status(400).json({ message: "File type is required" });
        }
        if (!fileData) {
            return response.status(400).json({ message: "File data is required" });
        }

        const lowerFileName = fileName.toLowerCase();

        if (documentType === "driverLicense") {
            const isJpg =
                mimeType === "image/jpeg" ||
                lowerFileName.endsWith(".jpg") ||
                lowerFileName.endsWith(".jpeg");

            if (!isJpg) {
                return response.status(400).json({ message: "Driver's license must be a JPG file" });
            }
        }

        if (documentType === "publicLiabilityInsurance" || documentType === "businessRegistration") {
            const isPdf =
                mimeType === "application/pdf" ||
                lowerFileName.endsWith(".pdf");

            if (!isPdf) {
                return response.status(400).json({ message: "This file must be a PDF" });
            }
        }

        const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
        const fileSizeBytes = Buffer.byteLength(base64Data, "base64");

        if (fileSizeBytes > 2 * 1024 * 1024) {
            return response.status(400).json({ message: "File size can't exceed 2MB" });
        }

        const documentData = {
            hirer: user,
            documentType,
            fileName,
            mimeType,
            fileData,
        };

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

        return response.json(uploaded);
    }

    async getByHirer(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const documents = await this.documentRepository.find({
            where: {
                hirer: { id: userId },
            },
            relations: ["hirer"],
        });

        return response.json(documents);
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