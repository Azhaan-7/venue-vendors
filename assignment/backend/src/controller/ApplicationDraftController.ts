import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ApplicationDraft } from "../entity/ApplicationDraft";
import { ApplicationDraftVenue } from "../entity/ApplicationDraftVenue";
import { User } from "../entity/User";
import { Venue } from "../entity/Venue";

export class ApplicationDraftController {
    private applicationDraftRepository = AppDataSource.getRepository(ApplicationDraft);
    private applicationDraftVenueRepository = AppDataSource.getRepository(ApplicationDraftVenue);
    private userRepository = AppDataSource.getRepository(User);
    private venueRepository = AppDataSource.getRepository(Venue);

    async getByHirer(request: Request, response: Response) {
        try {
            const hirerId = Number(request.params.hirerId);

            if (isNaN(hirerId)) {
                return response.status(400).json({ message: "Invalid hirer ID" });
            }
            const hirer = await this.userRepository.findOne({
                where: { id: hirerId }
            });

            if (!hirer) {
                return response.status(404).json({
                    message: "Hirer not found"
                });
            }

            const draft = await this.applicationDraftRepository.findOne({
                where: {
                    hirer: { id: hirerId }
                },
                relations: ["hirer", "applicationDraftVenues", "applicationDraftVenues.venue"]
            });

            if (!draft) {
                return response.json(null);
            }

            return response.json({
                event: {
                    eventName: draft.eventName,
                    guests: draft.guest,
                    date: draft.eventDate || "",
                    time: draft.eventTime || "",
                    duration: draft.durationHours,
                },
                venues: draft.applicationDraftVenues
                    .sort((a, b) => a.rankOrder - b.rankOrder)
                    .map(applicationDraftVenue => applicationDraftVenue.venue.id)
            });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to fetch application draft" });
        }
    }

    async saveForHirer(request: Request, response: Response) {
        try {
            const hirerId = Number(request.params.hirerId);
            const { event, venues } = request.body;

            if (isNaN(hirerId)) {
                return response.status(400).json({ message: "Invalid hirer ID" });
            }

            if (!event) {
                return response.status(400).json({ message: "Event details are required" });
            }

            if (!Array.isArray(venues)) {
                return response.status(400).json({ message: "Venues must be a list" });
            }

            const eventName = String(event.eventName || "").trim();
            const guests = Number(event.guests);
            const eventDate = String(event.date || "").trim();
            const parsedEventDate = new Date(eventDate);
            const eventTime = String(event.time || "").trim();
            const duration = Number(event.duration);

            if (!eventName) {
                return response.status(400).json({ message: "Event name is required" });
            }

            if (!eventDate) {
                return response.status(400).json({ message: "Event date is required" });
            }
            if (isNaN(parsedEventDate.getTime())) {
                return response.status(400).json({ message: "Invalid event date" });
            }

            if (!eventTime) {
                return response.status(400).json({ message: "Event time is required" });
            }

            if (!guests || guests <= 0) {
                return response.status(400).json({ message: "Number of guests must be greater than 0" });
            }

            if (!duration || duration <= 0) {
                return response.status(400).json({ message: "Duration must be greater than 0" });
            }

            if (venues.length === 0) {
                return response.status(400).json({ message: "At least one venue must be selected" });
            }

            const hirer = await this.userRepository.findOne({
                where: { id: hirerId }
            });

            if (!hirer) {
                return response.status(404).json({ message: "Hirer not found" });
            }

            const selectedVenues: Venue[] = [];

            for (let i = 0; i < venues.length; i++) {
                const venueId = Number(venues[i]);

                if (isNaN(venueId)) {
                    return response.status(400).json({ message: "Invalid venue ID" });
                }

                const venue = await this.venueRepository.findOne({
                    where: { id: venueId }
                });

                if (!venue) {
                    return response.status(404).json({ message: "Selected venue not found" });
                }

                if (guests > venue.capacity) {
                    return response.status(400).json({
                        message: `Guest count exceeds capacity for ${venue.name}`,
                    });
                }

                selectedVenues.push(venue);
            }

            let draft = await this.applicationDraftRepository.findOne({
                where: {
                    hirer: { id: hirerId }
                },
                relations: ["hirer", "applicationDraftVenues"]
            });

            if (!draft) {
                draft = this.applicationDraftRepository.create({
                    hirer,
                    eventName,
                    guest: guests,
                    eventDate: parsedEventDate,
                    eventTime,
                    durationHours: duration,
                });
            } else {
                draft.eventName = eventName;
                draft.guest = guests;
                draft.eventDate = parsedEventDate;
                draft.eventTime = eventTime;
                draft.durationHours = duration;

                if (draft.applicationDraftVenues.length > 0) {
                    await this.applicationDraftVenueRepository.remove(draft.applicationDraftVenues);
                }
            }

            const savedDraft = await this.applicationDraftRepository.save(draft);

            for (let i = 0; i < selectedVenues.length; i++) {
                const applicationDraftVenue = this.applicationDraftVenueRepository.create({
                    applicationDraft: savedDraft,
                    venue: selectedVenues[i],
                    rankOrder: i + 1
                });

                await this.applicationDraftVenueRepository.save(applicationDraftVenue);
            }

            return response.json({ message: "Application draft saved successfully" });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to save application draft" });
        }
    }

    async removeForHirer(request: Request, response: Response) {
        try {
            const hirerId = Number(request.params.hirerId);

            if (isNaN(hirerId)) {
                return response.status(400).json({ message: "Invalid hirer ID" });
            }

            const draft = await this.applicationDraftRepository.findOne({
                where: {
                    hirer: { id: hirerId }
                },
                relations: ["applicationDraftVenues"]
            });

            if (!draft) {
                return response.json({ message: "No application draft found" });
            }

            if (draft.applicationDraftVenues.length > 0) {
                await this.applicationDraftVenueRepository.remove(draft.applicationDraftVenues);
            }

            await this.applicationDraftRepository.remove(draft);

            return response.json({ message: "Application draft removed successfully" });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to remove application draft" });
        }
    }
}