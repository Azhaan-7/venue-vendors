import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { BlockedPeriod } from "../entity/BlockedPeriod";
import { Venue } from "../entity/Venue";

export class BlockedPeriodController {
    private blockedPeriodRepository = AppDataSource.getRepository(BlockedPeriod);
    private venueRepository = AppDataSource.getRepository(Venue); 
    
    async getAll(request: Request, response: Response) {
        const blockedPeriods = await this.blockedPeriodRepository.find({ relations: ["venue"] });

        const formattedBlockedPeriods = blockedPeriods.map(block => ({
            id: block.id,
            venueId: block.venue.id,
            startDate: block.startDate,
            endDate: block.endDate,
            reason: block.reason
        }));
        response.json(formattedBlockedPeriods);
    }

    async create(request: Request, response: Response) {
        const { vendorId, venueId, startDate, endDate, reason } = request.body;
        const vendorVenues = await this.venueRepository.findOne({ where: { id: venueId }, relations: ["vendor"] });
        if (vendorVenues.vendor.id !== vendorId) {
            return response.status(403).json({ message: "You can only block periods for your own venues" });
        }
        if (new Date(startDate) > new Date(endDate)) {
            return response.status(400).json({
                message: "Start date cannot be after end date"
            });
        }
        if (!venueId || !startDate || !endDate || !reason || reason.trim() === "") {
            return response.status(400).json({ message: "All fields are required" });
        }
        const venue = await this.venueRepository.findOne({ where: { id: venueId } });
        if (!venue) {
            return response.status(404).json({ message: "Venue not found for the given vendor ID" });
        }   
        const blockedPeriod = this.blockedPeriodRepository.create({ venue, startDate, endDate, reason });
        await this.blockedPeriodRepository.save(blockedPeriod);
        return response.status(201).json({ blockedPeriod, message: "Blocked period created successfully" });
    }

    async remove(request: Request, response: Response) {
        try {
            const id = Number(request.params.id);
            const blockedPeriod = await this.blockedPeriodRepository.findOne({ where: { id } });
            if (!blockedPeriod) {
                return response.status(404).json({ message: "Blocked period not found" });
            }
            await this.blockedPeriodRepository.remove(blockedPeriod);
            return response.json({ message: "Blocked period removed successfully" });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Error removing blocked period" });
        }
    }
}