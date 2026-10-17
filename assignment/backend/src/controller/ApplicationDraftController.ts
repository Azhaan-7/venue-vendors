import { HttpError } from "../utils/HttpError";
import { eventInputError } from "../security/input";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ApplicationDraft } from "../entity/ApplicationDraft";
import { ApplicationDraftVenue } from "../entity/ApplicationDraftVenue";
import { User } from "../entity/User";
import { Venue } from "../entity/Venue";

export class ApplicationDraftController {
    private applicationDraftRepository = AppDataSource.getRepository(ApplicationDraft);
    private userRepository = AppDataSource.getRepository(User);

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
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to fetch application draft" });
        }
    }

    async saveForHirer(request: Request, response: Response) {
        const { event, venues } = request.body;
        const validationError = eventInputError(event, venues);
        if (validationError) return response.status(400).json({ message: validationError });
        try {
            const result = await AppDataSource.transaction(async manager => {
                const applicationDraftRepository = manager.getRepository(ApplicationDraft);
                const applicationDraftVenueRepository = manager.getRepository(ApplicationDraftVenue);
                const userRepository = manager.getRepository(User);
                const venueRepository = manager.getRepository(Venue);
                const hirerId = Number(request.params.hirerId);

                if (isNaN(hirerId)) {
                    throw new HttpError(400, "Invalid hirer ID");
                }

                if (!event) {
                    throw new HttpError(400, "Event details are required");
                }

                if (!Array.isArray(venues)) {
                    throw new HttpError(400, "Venues must be a list");
                }

                const eventName = String(event.eventName || "").trim();
                const guests = Number(event.guests);
                const eventDate = String(event.date || "").trim();
                const parsedEventDate = new Date(eventDate);
                const eventTime = String(event.time || "").trim();
                const duration = Number(event.duration);

                if (!eventName) {
                    throw new HttpError(400, "Event name is required");
                }

                if (!eventDate) {
                    throw new HttpError(400, "Event date is required");
                }
                if (isNaN(parsedEventDate.getTime())) {
                    throw new HttpError(400, "Invalid event date");
                }

                if (!eventTime) {
                    throw new HttpError(400, "Event time is required");
                }

                if (!guests || guests <= 0) {
                    throw new HttpError(400, "Number of guests must be greater than 0");
                }

                if (!duration || duration <= 0) {
                    throw new HttpError(400, "Duration must be greater than 0");
                }

                if (venues.length === 0) {
                    throw new HttpError(400, "At least one venue must be selected");
                }

                const hirer = await userRepository.findOne({
                    where: { id: hirerId }
                });

                if (!hirer) {
                    throw new HttpError(404, "Hirer not found");
                }

                const selectedVenues: Venue[] = [];

                for (let i = 0; i < venues.length; i++) {
                    const venueId = Number(venues[i]);

                    if (isNaN(venueId)) {
                        throw new HttpError(400, "Invalid venue ID");
                    }

                    const venue = await venueRepository.findOne({
                        where: { id: venueId }
                    });

                    if (!venue) {
                        throw new HttpError(404, "Selected venue not found");
                    }

                    if (guests > venue.capacity) {
                        throw new HttpError(400, `Guest count exceeds capacity for ${venue.name}`);
                    }

                    selectedVenues.push(venue);
                }

                let draft = await applicationDraftRepository.findOne({
                    where: {
                        hirer: { id: hirerId }
                    },
                    relations: ["hirer", "applicationDraftVenues"]
                });

                if (!draft) {
                    draft = applicationDraftRepository.create({
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
                        await applicationDraftVenueRepository.remove(draft.applicationDraftVenues);
                    }
                }

                const savedDraft = await applicationDraftRepository.save(draft);

                for (let i = 0; i < selectedVenues.length; i++) {
                    const applicationDraftVenue = applicationDraftVenueRepository.create({
                        applicationDraft: savedDraft,
                        venue: selectedVenues[i],
                        rankOrder: i + 1
                    });

                    await applicationDraftVenueRepository.save(applicationDraftVenue);
                }

                return { message: "Application draft saved successfully" };
            });
            return response.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to save application draft" });
        }
    }

    async removeForHirer(request: Request, response: Response) {
        try {
            const result = await AppDataSource.transaction(async manager => {
                const applicationDraftRepository = manager.getRepository(ApplicationDraft);
                const applicationDraftVenueRepository = manager.getRepository(ApplicationDraftVenue);
                const hirerId = Number(request.params.hirerId);

                if (isNaN(hirerId)) {
                    throw new HttpError(400, "Invalid hirer ID");
                }

                const draft = await applicationDraftRepository.findOne({
                    where: {
                        hirer: { id: hirerId }
                    },
                    relations: ["applicationDraftVenues"]
                });

                if (!draft) {
                    return { message: "No application draft found" };
                }

                if (draft.applicationDraftVenues.length > 0) {
                    await applicationDraftVenueRepository.remove(draft.applicationDraftVenues);
                }

                await applicationDraftRepository.remove(draft);

                return { message: "Application draft removed successfully" };
            });
            return response.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to remove application draft" });
        }
    }
}
