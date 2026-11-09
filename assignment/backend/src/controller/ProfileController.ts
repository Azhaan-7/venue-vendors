import { validatePhone } from "../utils/validation";
import { savedCompleteness } from "../security/completeness";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Profile } from "../entity/Profile";
import { UserRole } from "../entity/UserRole";
import { vendorCanAccessHirer } from "../auth/authorization";

export class ProfileController {
    private profileRepository = AppDataSource.getRepository(Profile);

    async update(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const name = String(request.body.name || "").trim();
        const phoneNumber = String(request.body.phoneNumber || "").trim();
        const isBusiness = request.body.isBusiness === true || request.body.isBusiness === "true";
        const abn = String(request.body.abn || "").trim();
        // Reputation is maintained by the server. Ignore both historical client spellings.
        if (typeof request.body.name !== "string" || name.length > 100 || phoneNumber.length > 20) {
            return response.status(400).json({ message: "Invalid profile field length" });
        }

        if (name === "") {
            return response.status(400).json({ message: "Name is required" });
        }

        if (phoneNumber === "") {
            return response.status(400).json({ message: "Phone number is required" });
        }

        if (!validatePhone(phoneNumber)) {
            return response.status(400).json({ message: "Phone number must contain 8 to 12 digits, spaces and an optional leading +" });
        }

        if (isBusiness && abn === "") {
            return response.status(400).json({ message: "ABN is required for business applications" });
        }

        if (isBusiness && !/^\d+$/.test(abn)) {
            return response.status(400).json({ message: "ABN must contain numbers only" });
        }

        if (isBusiness && abn.length !== 11) {
            return response.status(400).json({ message: "ABN must be exactly 11 digits" });
        }
        const updatedProfile = {
            name,
            phoneNumber,
            isBusiness,
            abn: isBusiness ? abn : "",
        };

        let profile = await this.profileRepository.findOne({ where: { userId } });
        if (!profile) {
            profile = this.profileRepository.create({ userId, ...updatedProfile });
        } else {
            Object.assign(profile, updatedProfile);
        }
        const updated = await this.profileRepository.save(profile);

        return response.json({ ...updated, creditabilityScore: await savedCompleteness(userId, updated) });
    }

    async getProfile(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
        }

        const isOwner = request.authUser!.id === userId;
        const isRelatedVendor = request.authUser!.role === UserRole.VENDOR &&
            await vendorCanAccessHirer(request.authUser!.id, userId);
        if (!isOwner && !isRelatedVendor) {
            return response.status(403).json({ message: "You cannot access this profile" });
        }

        const profile = await this.profileRepository.findOne({ where: { userId }, relations: ["user"] });

        if (!profile) {
            return response.status(404).json({ message: "Profile not found" });
        }

        return response.json({
            name: profile.name,
            phoneNumber: profile.phoneNumber,
            isBusiness: profile.isBusiness,
            abn: profile.abn,
            creditabilityScore: await savedCompleteness(userId, profile),
            email: profile.user.email,
            role: profile.user.role,
            dateJoined: profile.user.dateJoined,
        });
    }
}
