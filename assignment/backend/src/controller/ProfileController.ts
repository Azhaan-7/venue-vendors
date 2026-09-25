import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Profile } from "../entity/Profile";

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
        const creditabilityScore = Number(request.body.credibilityScore || 0);

        if (name === "") {
            return response.status(400).json({ message: "Name is required" });
        }

        if (phoneNumber === "") {
            return response.status(400).json({ message: "Phone number is required" });
        }

        if (!/^[+\d\s]+$/.test(phoneNumber)) {
            return response.status(400).json({ message: "Phone number can only contain digits, spaces, and +" });
        }

        if (phoneNumber.replace(/\s/g, "").length < 8) {
            return response.status(400).json({ message: "Phone number is too short" });
        }

        if (phoneNumber.replace(/\s/g, "").length > 12) {
            return response.status(400).json({ message: "Phone number is too long" });
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
        //debugging
        console.log(request.body);

        const updatedProfile = {
            name,
            phoneNumber,
            isBusiness,
            abn: isBusiness ? abn : "",
            creditabilityScore,
        };

        let profile = await this.profileRepository.findOne({ where: { userId } });
        if (!profile) {
            profile = this.profileRepository.create({ userId, ...updatedProfile });
        } else {
            Object.assign(profile, updatedProfile);
        }
        const updated = await this.profileRepository.save(profile);

        return response.json(updated);
    }

    async getProfile(request: Request, response: Response) {
        const userId = Number(request.params.id);

        if (isNaN(userId)) {
            return response.status(400).json({ message: "Invalid user ID" });
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
            creditabilityScore: profile.creditabilityScore,
            email: profile.user.email,
            role: profile.user.role,
            dateJoined: profile.user.dateJoined,
        });
    }
}