import { HttpError } from "../utils/HttpError";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Application } from "../entity/Application";
import { User } from "../entity/User";
import { Venue } from "../entity/Venue";
import { ApplicationStatus } from "../entity/ApplicationStatus";
import { Comment } from "../entity/Comment";
import { ApplicationVenue } from "../entity/ApplicationVenue";
import { eventInputError, pagination, positiveId } from "../security/input";
import { vendorOwnsApplication } from "../auth/authorization";

export class ApplicationController {
    private applicationRepository = AppDataSource.getRepository(Application);
    private userRepository = AppDataSource.getRepository(User);

    async createApplication(request: Request, response: Response) {
        const { event, venues } = request.body;
        const validationError = eventInputError(event, venues);
        if (validationError) return response.status(400).json({ message: validationError });
        try {
            const result = await AppDataSource.transaction(async manager => {
                const applicationRepository = manager.getRepository(Application);
                const userRepository = manager.getRepository(User);
                const venueRepository = manager.getRepository(Venue);
                const applicationVenueRepository = manager.getRepository(ApplicationVenue);

                if (!event) {
                    throw new HttpError(400, "Event details not found");
                }

                const eventName = String(event.eventName || "").trim();
                const guests = Number(event.guests);
                const eventDate = String(event.date || "").trim();
                const eventTime = String(event.time || "").trim();
                const duration = Number(event.duration);

                if (!eventName) {
                    throw new HttpError(400, "Event name is required");
                }

                if (!eventDate) {
                    throw new HttpError(400, "Event date is required");
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

                if (!Array.isArray(venues) || venues.length === 0) {
                    throw new HttpError(400, "At least one venue must be selected");
                }

                const hirerId = request.authUser!.id;

                const hirer = await userRepository.findOne({
                    where: { id: hirerId },
                });

                if (!hirer) {
                    throw new HttpError(404, "Hirer not found");
                }

                const selectedVenues = [];

                for (let i = 0; i < venues.length; i++) {
                    const venueId = Number(venues[i]);

                    if (isNaN(venueId)) {
                        throw new HttpError(400, "Invalid venue ID");
                    }

                    const venue = await venueRepository.findOne({
                        where: { id: venueId },
                    });

                    if (!venue) {
                        throw new HttpError(404, "Selected venue not found");
                    }

                    if (guests > venue.capacity) {
                        throw new HttpError(400, `Guest count exceeds capacity for ${venue.name}`);
                    }

                    selectedVenues.push(venue);
                }


                const application = applicationRepository.create({
                    hirer,
                    eventName,
                    guest: guests,
                    eventDate,
                    eventTime,
                    durationHours: duration,
                });

                const savedApplication = await applicationRepository.save(application);

                for (let i = 0; i < selectedVenues.length; i++) {
                    const applicationVenue = applicationVenueRepository.create({
                        application: savedApplication,
                        venue: selectedVenues[i],
                        rankOrder: i + 1,
                    });

                    await applicationVenueRepository.save(applicationVenue);
                }

                return {
                    id: savedApplication.id,
                    event: { eventName, guests, date: eventDate, time: eventTime, duration },
                    venues: selectedVenues.map(venue => venue.id),
                    dateApplied: savedApplication.dateApplied,
                    hirerID: hirer.id,
                    status: savedApplication.status,
                };
            });
            return response.status(201).json(result);
        } catch (error) {
            if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to create application" });
        }
    }

    async hirerApplications(request: Request, response: Response) {
        try {
            const hirerId = Number(request.params.hirerId);
            if (isNaN(hirerId)) {
                return response.status(400).json({ message: "Invalid hirer ID" });
            }
            const applications = await this.applicationRepository.find({
                ...pagination(request),
                where: {
                    hirer: {
                        id: hirerId,
                    },
                },
                relations: {
                    hirer: true,
                    approvedVenue: true,
                    applicationVenues: {
                        venue: true,
                    },
                },
            });

            const formattedApplications = applications.map((app) => ({
                event: {
                    eventName: app.eventName,
                    guests: app.guest,
                    date: app.eventDate,
                    time: app.eventTime,
                    duration: app.durationHours,
                },
                venues: app.applicationVenues
                    .sort((a, b) => a.rankOrder - b.rankOrder)
                    .map((av) => av.venue.id),
                dateApplied: app.dateApplied,
                hirerID: app.hirer.id,
                status: app.status,
                approvedVenueID: app.approvedVenue?.id,
            }));

            return response.json(formattedApplications);
        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to fetch applications" });
        }
    }

    async getAll(request: Request, response: Response) {
        const applications = await this.applicationRepository.find({ ...pagination(request), relations: ["hirer", "hirer.profile", "applicationVenues", "applicationVenues.venue", "comments", "approvedVenue"] });
        const formatApplication = applications.map(app => ({
            id: app.id,
            event: {
                eventName: app.eventName,
                guests: app.guest,
                date: app.eventDate,
                time: app.eventTime,
                duration: app.durationHours,
            },
            venues: app.applicationVenues
                .sort((a, b) => a.rankOrder - b.rankOrder)
                .map(av => av.venue.id),
            dateApplied: app.dateApplied,
            hirerID: app.hirer.id,
            hirerEmail: app.hirer.email,
            status: app.status,
            approvedVenueID: app.approvedVenue?.id,
            comment: app.comments.length > 0 ? app.comments[app.comments.length - 1].commentText : "",
            reputationScore: app.hirer.profile?.creditabilityScore || 0,
        }));
        response.json(formatApplication);
    }

    async approveApplication(request: Request, response: Response) {
        if (!positiveId(request.params.id) || (request.body.commentText !== undefined &&
            (typeof request.body.commentText !== "string" || request.body.commentText.length > 2000))) {
            return response.status(400).json({ message: "Invalid application ID or comment (maximum 2000 characters)" });
        }
        if (!positiveId(request.body.venueId)) return response.status(400).json({ message: "Invalid venue ID" });
        try {
            const result = await AppDataSource.transaction(async manager => {
                const applicationRepository = manager.getRepository(Application);
                const userRepository = manager.getRepository(User);
                const venueRepository = manager.getRepository(Venue);
                const applicationVenueRepository = manager.getRepository(ApplicationVenue);
                const commentRepository = manager.getRepository(Comment);
                const applicationId = Number(request.params.id);
                if (!await vendorOwnsApplication(request.authUser!.id, applicationId, manager)) {
                    throw new HttpError(403, "You cannot manage this application");
                }
                const application = await applicationRepository.findOne({ where: { id: applicationId } });
                if (!application) {
                    throw new HttpError(404, "Application not found");
                }
                const rankedVenue = await applicationVenueRepository.findOne({
                    where: { application: { id: applicationId }, venue: { id: Number(request.body.venueId) } },
                });
                if (!rankedVenue) {
                    throw new HttpError(400, "The approved venue must be ranked on this application");
                }
                const venue = await venueRepository.findOne({ where: { id: request.body.venueId }, relations: ["vendor"] });
                if (!venue) {
                    throw new HttpError(404, "Venue not found");
                }
                if (venue.vendor?.id !== request.authUser!.id) {
                    throw new HttpError(403, "You can only approve applications for your own venue");
                }
                if (application.status !== ApplicationStatus.PENDING) throw new HttpError(409, "Application has already been decided");
                application.status = ApplicationStatus.APPROVED;
                application.decisionDate = new Date();
                application.approvedVenue = venue;
                application.rejectReason = null;
                const decision = await applicationRepository.update({ id: applicationId, status: ApplicationStatus.PENDING }, {
                    status: application.status, decisionDate: application.decisionDate, approvedVenue: venue, rejectReason: null,
                });
                if (!decision.affected) throw new HttpError(409, "Application has already been decided");
                if (request.body.commentText) {
                    const vendor = await userRepository.findOne({ where: { id: request.authUser!.id } });
                    if (vendor) {
                        const comment = commentRepository.create({ application, vendor, commentText: request.body.commentText });
                        await commentRepository.save(comment);
                    }
                }
                return {
                    application: { id: application.id, status: application.status, approvedVenueID: venue.id },
                    message: "Application approved successfully",
                };
            });
            return response.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
            response.status(500).json({ message: "Failed to approve application" });
        }
    }

    async rejectApplication(request: Request, response: Response) {
        if (!positiveId(request.params.id) || (request.body.commentText !== undefined &&
            (typeof request.body.commentText !== "string" || request.body.commentText.length > 2000))) {
            return response.status(400).json({ message: "Invalid application ID or comment (maximum 2000 characters)" });
        }
        try {
            const applicationRepository = AppDataSource.getRepository(Application);
            const applicationId = Number(request.params.id);
            if (!await vendorOwnsApplication(request.authUser!.id, applicationId)) {
                return response.status(403).json({ message: "You cannot manage this application" });
            }
            const application = await applicationRepository.findOne({ where: { id: applicationId }, });
            if (!application) {
                return response.status(404).json({ message: "Application not found" });
            }
            if (application.status !== ApplicationStatus.PENDING) return response.status(409).json({ message: "Application has already been decided" });
            application.status = ApplicationStatus.REJECTED;
            application.decisionDate = new Date();
            application.approvedVenue = null;
            application.rejectReason = request.body.commentText || "Application has been rejected";
            const decision = await applicationRepository.update({ id: applicationId, status: ApplicationStatus.PENDING }, {
                status: application.status, decisionDate: application.decisionDate, approvedVenue: null, rejectReason: application.rejectReason,
            });
            if (!decision.affected) return response.status(409).json({ message: "Application has already been decided" });
            response.json({
                application: { id: application.id, status: application.status, rejectReason: application.rejectReason },
                message: "Application rejected successfully",
            });
        } catch (error) {
            response.status(500).json({ message: "Failed to reject application" });
        }
    }

    async updateComment(request: Request, response: Response) {
        if (!positiveId(request.params.id) || (request.body.commentText !== undefined &&
            (typeof request.body.commentText !== "string" || request.body.commentText.length > 2000))) {
            return response.status(400).json({ message: "Invalid application ID or comment (maximum 2000 characters)" });
        }
        if (typeof request.body.commentText !== "string") return response.status(400).json({ message: "Comment is required" });
        try {
            const applicationId = Number(request.params.id);
            const { commentText } = request.body;
            const vendorId = request.authUser!.id;

            if (!await vendorOwnsApplication(vendorId, applicationId)) {
                return response.status(403).json({ message: "You cannot manage this application" });
            }

            const commentRepository = AppDataSource.getRepository(Comment);
            let comment = await commentRepository.findOne({
                where: {
                    application: { id: applicationId },
                    vendor: { id: vendorId }
                },
                relations: ["application", "vendor"]
            });
            if (comment) {
                comment.commentText = commentText;
            } else {
                const application = await this.applicationRepository.findOne({
                    where: { id: applicationId }
                });
                const vendor = await this.userRepository.findOne({
                    where: { id: vendorId }
                });
                if (!application || !vendor) {
                    return response.status(404).json({
                        message: "Application or vendor not found"
                    });
                }
                comment = commentRepository.create({ application, vendor, commentText })
            }
            await commentRepository.save(comment);
            return response.json({ message: "comment saved successfully" });
        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({ message: "Failed to save comment" });
        }
    }

    async getVendorApplications(request: Request, response: Response) {
        try {
            const vendorId = Number(request.params.vendorId);

            const eligibleApplications = this.applicationRepository.createQueryBuilder("eligible")
                .select("eligible.id")
                .innerJoin("eligible.applicationVenues", "preference")
                .innerJoin("preference.venue", "ownedVenue")
                .where("ownedVenue.vendor = :vendorId", { vendorId });
            const applications = await this.applicationRepository.createQueryBuilder("application")
                .where(`application.id IN (${eligibleApplications.getQuery()})`)
                .setParameters(eligibleApplications.getParameters())
                .setFindOptions({
                    ...pagination(request),
                    relations: [
                        "hirer",
                        "hirer.profile",
                        "applicationVenues",
                        "applicationVenues.venue",
                        "applicationVenues.venue.vendor",
                        "comments",
                        "comments.vendor",
                        "approvedVenue",
                        "approvedVenue.vendor"
                    ]
                }).getMany();

            const vendorApplications = applications.filter(app =>
                app.applicationVenues.some(
                    av => av.venue.vendor?.id === vendorId
                )
            );

            const formattedApplications = vendorApplications.map(app => ({
                id: app.id,
                event: {
                    eventName: app.eventName,
                    guests: app.guest,
                    date: app.eventDate,
                    time: app.eventTime,
                    duration: app.durationHours,
                },
                venues: app.applicationVenues
                    .sort((a, b) => a.rankOrder - b.rankOrder)
                    .map(av => av.venue.id),

                dateApplied: app.dateApplied,
                hirerID: app.hirer.id,
                hirerEmail: app.hirer.email,
                status: app.status,
                approvedVenueID: app.approvedVenue?.id,

                comment:
                    app.comments.length > 0
                        ? app.comments.filter(comment => comment.vendor?.id === vendorId).slice(-1)[0]?.commentText || ""
                        : "",

                reputationScore:
                    app.hirer.profile?.creditabilityScore || 0,
            }));

            return response.json(formattedApplications);

        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return response.status(500).json({
                message: "Failed to load applications"
            });
        }
    }

    async getVendorStats(req: Request, res: Response) {
        try {
            const VendorId = Number(req.params.vendorId);
            const period = req.query.period as string;
            if (period && !["all", "week", "month", "lastMonth"].includes(period)) return res.status(400).json({ message: "Invalid reporting period" });

            const applications = await this.applicationRepository.find({
                take: 5001,
                order: { id: "ASC" },
                where: { applicationVenues: { venue: { vendor: { id: VendorId } } } },
                relations: [
                    "hirer",
                    "hirer.profile",
                    "applicationVenues",
                    "applicationVenues.venue",
                    "applicationVenues.venue.vendor",
                    "approvedVenue",
                    "approvedVenue.vendor"
                ]
            });

            if (applications.length > 5000) return res.status(422).json({ message: "Report exceeds 5000 applications; database aggregation is required" });
            let vendorApplications = applications.filter(app =>
                app.applicationVenues.some(
                    av => av.venue.vendor?.id === VendorId
                )
            );

            const now = new Date();

            let filteredByCreated = vendorApplications;
            let filteredByDecision = vendorApplications;

            if (period === "week") {
                const week = new Date();
                week.setDate(now.getDate() - 7);
                filteredByCreated = vendorApplications.filter(app =>
                    new Date(app.dateApplied) >= week
                );
                filteredByDecision = vendorApplications.filter(app =>
                    app.decisionDate && new Date(app.decisionDate) >= week
                );
            }

            if (period === "month") {
                filteredByCreated = vendorApplications.filter(app => {
                    const d = new Date(app.dateApplied);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                filteredByDecision = vendorApplications.filter(app => {
                    if (!app.decisionDate) return false;
                    const d = new Date(app.decisionDate);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            }

            if (period === "lastMonth") {
                const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                filteredByCreated = vendorApplications.filter(app => {
                    const d = new Date(app.dateApplied);
                    return d.getMonth() === lastMonth && d.getFullYear() === year;
                });
                filteredByDecision = vendorApplications.filter(app => {
                    if (!app.decisionDate) return false;
                    const d = new Date(app.decisionDate);
                    return d.getMonth() === lastMonth && d.getFullYear() === year;
                });
            }

            // Charts 1 & 2 - approved apps filtered by decisionDate
            const approvedApp = filteredByDecision.filter(app => app.status === ApplicationStatus.APPROVED && app.approvedVenue?.vendor?.id === VendorId);

            // chart 1
            const venueTallies: Record<string, Record<string, number>> = {};
            approvedApp.forEach(app => {
                const venueName = app.approvedVenue?.name || "Unknown Venue";
                const hirerName = app.hirer.profile?.name || `Hirer ${app.hirer.id}`;
                if (!venueTallies[venueName]) {
                    venueTallies[venueName] = {};
                }
                venueTallies[venueName][hirerName] = (venueTallies[venueName][hirerName] || 0) + 1;
            });

            // chart 2
            const combinedTallies: Record<string, number> = {};
            approvedApp.forEach(app => {
                const hirerName = app.hirer.profile?.name || `Hirer ${app.hirer.id}`;
                combinedTallies[hirerName] = (combinedTallies[hirerName] || 0) + 1;
            });

            // chart 3 - all apps filtered by date applied
            const hirerActivity: Record<string, number> = {};
            filteredByCreated.forEach(app => {
                const hirerName = app.hirer.profile?.name || `Hirer ${app.hirer.id}`;
                hirerActivity[hirerName] = (hirerActivity[hirerName] || 0) + 1;
            });

            let mostActive = null;
            let leastActive = null;
            const combinedArray = Object.entries(hirerActivity).map(([name, count]) => ({ name, count }));

            if (combinedArray.length === 1) {
                mostActive = combinedArray[0];
            } else if (combinedArray.length > 1) {
                mostActive = combinedArray.reduce((a, b) => a.count > b.count ? a : b);
                const leastCandidate = combinedArray.reduce((a, b) => a.count < b.count ? a : b);
                leastActive = leastCandidate.name !== mostActive.name ? leastCandidate : null;
            }

            // chart 4 - venue utilization over time
            const venueUtilization: Record<string, Record<string, number>> = {};

            filteredByCreated.forEach(app => {
                const date = new Date(app.dateApplied);
                let dateKey: string;

                if (period === "week") {
                    dateKey = date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" });
                } else if (period === "month" || period === "lastMonth") {
                    dateKey = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
                } else {
                    dateKey = date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
                }

                app.applicationVenues.forEach(av => {
                    if (av.venue.vendor?.id === VendorId) {
                        const venueName = av.venue.name || "Unknown Venue";
                        if (!venueUtilization[venueName]) {
                            venueUtilization[venueName] = {};
                        }
                        venueUtilization[venueName][dateKey] = (venueUtilization[venueName][dateKey] || 0) + 1;
                    }
                });
            });

            // update return to include venueUtilization
            return res.json({ venueTallies, combinedTallies, hirerActivity, mostActive, leastActive, venueUtilization });

        } catch (error) {
            console.error("Database operation failed; details suppressed");
            return res.status(500).json({
                message: "Failed to load stats"
            });
        }
    }
}
