import { HttpError } from "../utils/HttpError";
import { pagination, positiveId, venueInputError } from "../security/input";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source"
import { Venue } from "../entity/Venue";
import { User } from "../entity/User";
import { VenueSuitability } from "../entity/VenueSuitability";
import { ApplicationVenue } from "../entity/ApplicationVenue";

export class VenueController {
    private venueRepository = AppDataSource.getRepository(Venue);

    async getAll(req: Request, res: Response) {
        try {
            const venues = await this.venueRepository.find({
                ...pagination(req),
                relations: {
                    venueSuitabilities: true
                }
            });
            return res.json(venues);  
        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return res.status(500).json({message: "Failed to load venues"})
        }
    }

    async getByVendor (req: Request, res: Response) {
        try {
            const vendorId = Number(req.params.vendorId);
            const venues = await this.venueRepository.find({
                ...pagination(req),
                where: {
                    vendor: {
                        id: vendorId
                    }
                },
                relations: ["vendor", "venueSuitabilities"]
            });
            return res.json(venues.map(venue => ({
                ...venue,
                vendor: venue.vendor ? { id: venue.vendor.id, email: venue.vendor.email } : null,
            })));
        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return res.status(500).json({
                message: "Failed to load vendor venues"
            });
        }
    }

    async createVenue (req: Request, res: Response) {
        const validationError = venueInputError(req.body);
        if (validationError) return res.status(400).json({ message: validationError });
        try {
            const result = await AppDataSource.transaction(async manager => {
                const venueRepository = manager.getRepository(Venue);
                const userRepository = manager.getRepository(User);
                const suitabilityRepository = manager.getRepository(VenueSuitability);
                const {name, location, capacity, price, description, image, suitabilities} = req.body;
                const vendorId = req.authUser!.id;
                if (
                    !vendorId ||
                    !name?.trim() ||
                    !location?.trim() ||
                    !description?.trim() ||
                    !image?.trim()
                ) {
                    throw new HttpError(400, "All fields are required");
                }

                // Numeric validation
                if (
                    isNaN(Number(capacity)) ||
                    Number(capacity) <= 0
                ) {
                    throw new HttpError(400, "Capacity must be greater than 0");
                }

                if (
                    isNaN(Number(price)) ||
                    Number(price) <= 0
                ) {
                    throw new HttpError(400, "Price must be greater than 0");
                }
                const vendor = await userRepository.findOne({
                    where: {id:vendorId}
                });
                if(!vendor) {
                    throw new HttpError(404, "Vendor not found");
                }
                const venue = venueRepository.create({name, location, capacity, price, description, image, vendor});
                const savedVenue = await venueRepository.save(venue);
                if (Array.isArray(suitabilities)) {
                    for (const keyword of req.body.suitabilities) {
                        const suitability = suitabilityRepository.create({
                            venue: savedVenue,
                            keyword
                        });

                        await suitabilityRepository.save(suitability);
                    }
                }
                const venueWithSuitabilities = await venueRepository.findOne({where:{id:savedVenue.id},
                relations: {
                    venueSuitabilities: true
                }});
                return venueWithSuitabilities;
            });
            return res.status(201).json(result);
        } catch (error) {
            if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");
            return res.status(500).json({
                message: "Failed to create venue"
            });
        }
    }

    async updateVenue (req: Request, res: Response) {
        const validationError = venueInputError(req.body);
        if (validationError) return res.status(400).json({ message: validationError });
        try {
            const result = await AppDataSource.transaction(async manager => {
                const venueRepository = manager.getRepository(Venue);
                const suitabilityRepository = manager.getRepository(VenueSuitability);
                if (!positiveId(req.params.id)) throw new HttpError(400, "Invalid venue ID");
                const venueId = Number(req.params.id);
                const venue = await venueRepository.findOne({
                    where: {id:venueId},
                    relations: {
                        vendor: true,
                        venueSuitabilities: true
                    }
                });

                if (!venue) {
                    throw new HttpError(404, "Venue not found");
                }
                if (venue.vendor?.id !== req.authUser!.id) {
                    throw new HttpError(403, "You can only update your own venues");
                }
                if (!req.body.name || !req.body.location || !req.body.capacity || !req.body.price || !req.body.description || !req.body.image) {
                    throw new HttpError(400, "All fields are required");
                }
                if (req.body.capacity <= 0 || req.body.price <= 0) {
                    throw new HttpError(400, "Capacity and price must be positive numbers");
                }
                venue.name = req.body.name;
                venue.location = req.body.location;
                venue.capacity = req.body.capacity;
                venue.price = req.body.price;
                venue.description = req.body.description
                venue.image = req.body.image;
                await venueRepository.save(venue);
                await suitabilityRepository.delete({
                    venue: {id:venueId}
                });
                if(Array.isArray(req.body.suitabilities)) {
                    for (const keyword of req.body.suitabilities){
                        const suitability = suitabilityRepository.create({venue,keyword});
                        await suitabilityRepository.save(suitability);
                    }
                }
                const updatedVenue = await venueRepository.findOne({
                    where: {id:venueId},
                    relations: {
                        venueSuitabilities:true
                    }
                });
                return updatedVenue;
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");
            return res.status(500).json({
                message: "Failed to update venue"
            });
        }
    }

   async deleteVenue(req: Request, res: Response) {
        try {
            const result = await AppDataSource.transaction(async manager => {
                const venueRepository = manager.getRepository(Venue);
                const suitabilityRepository = manager.getRepository(VenueSuitability);
                const applicationRepository = manager.getRepository(ApplicationVenue);
                if (!positiveId(req.params.id)) throw new HttpError(400, "Invalid venue ID");
                const venueId = Number(req.params.id);

                const venue = await venueRepository.findOne({ where: { id: venueId }, relations: ["vendor"] });
                if (!venue) throw new HttpError(404, "Venue not found");
                if (venue.vendor?.id !== req.authUser!.id) {
                    throw new HttpError(403, "You can only delete your own venues");
                }

                const existingApplication = await applicationRepository.count({
                    where: {
                        venue: {
                            id: venueId
                        }
                    }
                });

                if (existingApplication > 0) {
                    throw new HttpError(400, "This venue cannot be deleted because applications have been submitted for it.");
                }

                await suitabilityRepository.delete({
                    venue: { id: venueId }
                });

                await venueRepository.delete(venueId);

                return {
                    message: "Venue deleted successfully"
                };

            });
            return res.json(result);
        } catch (error) {
            if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");

            return res.status(500).json({
                message: "Failed to delete venue"
            });
        }
    }
}
