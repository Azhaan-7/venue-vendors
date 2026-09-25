import { Request, Response } from "express";
import { AppDataSource } from "../data-source"
import { Venue } from "../entity/Venue";
import { User } from "../entity/User";
import { VenueSuitability } from "../entity/VenueSuitability";
import { ApplicationVenue } from "../entity/ApplicationVenue";

export class VenueController {
    private venueRepository = AppDataSource.getRepository(Venue);
    private userRepository = AppDataSource.getRepository(User);
    private suitabilityRepository = AppDataSource.getRepository(VenueSuitability);
    private applicationRepository = AppDataSource.getRepository(ApplicationVenue);

    async getAll(req: Request, res: Response) {
        try {
            const venues = await this.venueRepository.find({
                relations: {
                    venueSuitabilities: true
                }
            });
            return res.json(venues);  
        } catch (error) {
            console.error(error);
            return res.status(500).json({message: "Failed to load venues"})
        }
    }

    async getByVendor (req: Request, res: Response) {
        try {
            const vendorId = Number(req.params.vendorId);
            const venues = await this.venueRepository.find({
                where: {
                    vendor: {
                        id: vendorId
                    }
                },
                relations: ["vendor", "venueSuitabilities"]
            });
            return res.json(venues);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to load vendor venues"
            });
        }
    }

    async createVenue (req: Request, res: Response) {
        try {
            const {vendorId, name, location, capacity, price, description, image, suitabilities} = req.body;
            if (
                !vendorId ||
                !name?.trim() ||
                !location?.trim() ||
                !description?.trim() ||
                !image?.trim()
            ) {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }

            // Numeric validation
            if (
                isNaN(Number(capacity)) ||
                Number(capacity) <= 0
            ) {
                return res.status(400).json({
                    message: "Capacity must be greater than 0"
                });
            }

            if (
                isNaN(Number(price)) ||
                Number(price) <= 0
            ) {
                return res.status(400).json({
                    message: "Price must be greater than 0"
                });
            }
            const vendor = await this.userRepository.findOne({
                where: {id:vendorId}
            });
            if(!vendor) {
                return res.status(404).json ({
                    message: "Vendor not found"
                });
            }
            const venue = this.venueRepository.create({name, location, capacity, price, description, image, vendor});
            const savedVenue = await this.venueRepository.save(venue);
            if (Array.isArray(suitabilities)) {
                for (const keyword of req.body.suitabilities) {
                    const suitability = this.suitabilityRepository.create({
                        venue: savedVenue,
                        keyword
                    });

                    await this.suitabilityRepository.save(suitability);
                }
            }
            const venueWithSuitabilities = await this.venueRepository.findOne({where:{id:savedVenue.id},
            relations: {
                venueSuitabilities: true
            }});
            return res.status(201).json(venueWithSuitabilities);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to create venue"
            });
        }
    }

    async updateVenue (req: Request, res: Response) {
        try {
            const venueId = Number(req.params.id);
            const venue = await this.venueRepository.findOne({
                where: {id:venueId},
                relations: {
                    vendor: true,
                    venueSuitabilities: true
                }
            });

            if (!venue) {
                return res.status(404).json ({
                    message: "Venue not found"
                });
            }
            if (!req.body.name || !req.body.location || !req.body.capacity || !req.body.price || !req.body.description || !req.body.image) {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }
            if (req.body.capacity <= 0 || req.body.price <= 0) {
                return res.status(400).json({
                    message: "Capacity and price must be positive numbers"
                });
            }
            venue.name = req.body.name;
            venue.location = req.body.location;
            venue.capacity = req.body.capacity;
            venue.price = req.body.price;
            venue.description = req.body.description
            venue.image = req.body.image;
            await this.venueRepository.save(venue);
            await this.suitabilityRepository.delete({
                venue: {id:venueId}
            });
            if(Array.isArray(req.body.suitabilities)) {
                for (const keyword of req.body.suitabilities){
                    const suitability = this.suitabilityRepository.create({venue,keyword});
                    await this.suitabilityRepository.save(suitability);
                }
            }
            const updatedVenue = await this.venueRepository.findOne({
                where: {id:venueId},
                relations: {
                    venueSuitabilities:true
                }
            });
            return res.json(updatedVenue);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to update venue"
            });
        }
    }

   async deleteVenue(req: Request, res: Response) {
        try {
            const venueId = Number(req.params.id);

            const existingApplication = await this.applicationRepository.count({
                where: {
                    venue: {
                        id: venueId
                    }
                }
            });

            if (existingApplication > 0) {
                return res.status(400).json({
                    message: "This venue cannot be deleted because applications have been submitted for it."
                });
            }

            await this.suitabilityRepository.delete({
                venue: { id: venueId }
            });

            await this.venueRepository.delete(venueId);

            return res.json({
                message: "Venue deleted successfully"
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                message: "Failed to delete venue"
            });
        }
    }
}