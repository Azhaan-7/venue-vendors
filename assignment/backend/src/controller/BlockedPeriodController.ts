import { HttpError } from "../utils/HttpError";
import { assertNoApprovedBooking } from "../security/booking";
import { pagination, positiveId, validDate } from "../security/input";
import { UserRole } from "../entity/UserRole";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { BlockedPeriod } from "../entity/BlockedPeriod";
import { Venue } from "../entity/Venue";

export class BlockedPeriodController {
    private blockedPeriodRepository = AppDataSource.getRepository(BlockedPeriod);
    private venueRepository = AppDataSource.getRepository(Venue); 
    
    async getAll(request: Request, response: Response) {
        const blockedPeriods = await this.blockedPeriodRepository.find({
            ...pagination(request),
            where: request.authUser!.role === UserRole.VENDOR ? { venue: { vendor: { id: request.authUser!.id } } } : {},
            relations: ["venue"],
        });

        const formattedBlockedPeriods = blockedPeriods.map(block => ({
            id: block.id,
            venueId: block.venue.id,
            startDate: block.startDate,
            endDate: block.endDate,
            reason: request.authUser!.role === UserRole.HIRER ? "Unavailable" : block.reason
        }));
        response.json(formattedBlockedPeriods);
    }

    async create(request: Request, response: Response) {
        const { venueId, startDate, endDate, reason } = request.body;
        if (!positiveId(venueId) || !validDate(startDate) || !validDate(endDate) ||
            typeof reason !== "string" || !reason.trim() || reason.length > 255) {
            return response.status(400).json({ message: "A valid venue ID, date range and reason (1 to 255 characters) are required" });
        }
        if (startDate > endDate) return response.status(400).json({ message: "Start date cannot be after end date" });
        try {
            const blockedPeriod = await AppDataSource.transaction(async manager => {
                const venue = await manager.getRepository(Venue).findOne({
                    where: { id: Number(venueId) }, relations: ["vendor"], lock: { mode: "pessimistic_write" },
                });
                if (!venue) throw new HttpError(404, "Venue not found");
                if (venue.vendor?.id !== request.authUser!.id) throw new HttpError(403, "You can only block periods for your own venues");
                const start = new Date(`${startDate}T00:00:00Z`);
                const end = new Date(`${endDate}T00:00:00Z`);
                end.setUTCDate(end.getUTCDate() + 1);
                await assertNoApprovedBooking(manager, venue.id, start, end);
                const repository = manager.getRepository(BlockedPeriod);
                return repository.save(repository.create({ venue, startDate, endDate, reason: reason.trim() }));
            });
            return response.status(201).json({ blockedPeriod, message: "Blocked period created successfully" });
        } catch (error) {
            if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
            return response.status(500).json({ message: "Failed to create blocked period" });
        }
    }

    async remove(request: Request, response: Response) {
        try {
            if (!positiveId(request.params.id)) return response.status(400).json({ message: "Invalid blocked period ID" });
            const id = Number(request.params.id);
            const blockedPeriod = await this.blockedPeriodRepository.findOne({ where: { id }, relations: ["venue", "venue.vendor"] });
            if (!blockedPeriod) {
                return response.status(404).json({ message: "Blocked period not found" });
            }
            if (blockedPeriod.venue.vendor?.id !== request.authUser!.id) {
                return response.status(403).json({ message: "You can only remove blocks for your own venues" });
            }
            await this.blockedPeriodRepository.remove(blockedPeriod);
            return response.json({ message: "Blocked period removed successfully" });
        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Error removing blocked period" });
        }
    }
}
