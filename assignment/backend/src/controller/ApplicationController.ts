import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Application } from "../entity/Application";
import { User } from "../entity/User";
import { Venue } from "../entity/Venue";
import { ApplicationStatus } from "../entity/ApplicationStatus";
import { Comment } from "../entity/Comment";
import { ApplicationVenue } from "../entity/ApplicationVenue";

export class ApplicationController {
    private applicationRepository = AppDataSource.getRepository(Application);
    private userRepository = AppDataSource.getRepository(User);
    private venueRepository = AppDataSource.getRepository(Venue);
    private applicationVenueRepository = AppDataSource.getRepository(ApplicationVenue);

    async createApplication(request: Request, response: Response) {
        try {
            const { event, venues, hirerID } = request.body;

            if (!event) {
                return response.status(400).json({ message: "Event details not found" });
            }

            const eventName = String(event.eventName || "").trim();
            const guests = Number(event.guests);
            const eventDate = String(event.date || "").trim();
            const eventTime = String(event.time || "").trim();
            const duration = Number(event.duration);

            if (!eventName) {
                return response.status(400).json({ message: "Event name is required" });
            }

            if (!eventDate) {
                return response.status(400).json({ message: "Event date is required" });
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

            if (!Array.isArray(venues) || venues.length === 0) {
                return response.status(400).json({ message: "At least one venue must be selected" });
            }

            const hirerId = Number(hirerID);

            if (isNaN(hirerId)) {
                return response.status(400).json({ message: "Invalid hirer ID" });
            }

            const hirer = await this.userRepository.findOne({
                where: { id: hirerId },
            });

            if (!hirer) {
                return response.status(404).json({ message: "Hirer not found" });
            }

            const selectedVenues = [];

            for (let i = 0; i < venues.length; i++) {
                const venueId = Number(venues[i]);

                if (isNaN(venueId)) {
                    return response.status(400).json({ message: "Invalid venue ID" });
                }

                const venue = await this.venueRepository.findOne({
                    where: { id: venueId },
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
  

            const application = this.applicationRepository.create({
                hirer,
                eventName,
                guest: guests,
                eventDate,
                eventTime,
                durationHours: duration,
            });

            const savedApplication = await this.applicationRepository.save(application);

            for (let i = 0; i < selectedVenues.length; i++) {
                const applicationVenue = this.applicationVenueRepository.create({
                    application: savedApplication,
                    venue: selectedVenues[i],
                    rankOrder: i + 1,
                });

                await this.applicationVenueRepository.save(applicationVenue);
            }

            return response.status(201).json(savedApplication);
        } catch (error) {
            console.error(error);
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
            console.error(error);
            return response.status(500).json({ message: "Failed to fetch applications" });
        }
    }

    async getAll(request: Request, response: Response) {
        const applications = await this.applicationRepository.find({ relations: ["hirer", "hirer.profile", "applicationVenues", "applicationVenues.venue", "comments", "approvedVenue"] });
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
            hirerID: String(app.hirer.id),
            hirerEmail: app.hirer.email,
            status: app.status,
            approvedVenueID: app.approvedVenue?.id,
            comment: app.comments.length > 0 ? app.comments[app.comments.length - 1].commentText : "",
            reputationScore: app.hirer.profile?.creditabilityScore || 0,
        }));
        response.json(formatApplication);
    }

    async approveApplication(request: Request, response: Response) {
        try {
            const applicationRepository = AppDataSource.getRepository(Application);
            const venueRepository = AppDataSource.getRepository(Venue);
            const commentRepository = AppDataSource.getRepository(Comment);
            const userRepository = AppDataSource.getRepository(User);
            const application = await applicationRepository.findOne({ where: { id: Number(request.params.id) } });
            if (!application) {
                return response.status(404).json({ message: "Application not found" });
            }
            const venue = await venueRepository.findOne({ where: { id: request.body.venueId } });
            if (!venue) {
                return response.status(404).json({ message: "Venue not found" });
            }
            application.status = ApplicationStatus.APPROVED;
            application.decisionDate = new Date();
            application.approvedVenue = venue;
            application.rejectReason = null;
            await applicationRepository.save(application);
            if (request.body.commentText) {
                const vendor = await userRepository.findOne({ where: { id: request.body.vendorId } });
                if (vendor) {
                    const comment = commentRepository.create({ application, vendor, commentText: request.body.commentText });
                    await commentRepository.save(comment);
                }
            }
            response.json({ application, message: "Application approved successfully" });
        } catch (error) {
            response.status(500).json({ message: "Failed to approve application" });
        }
    }

    async rejectApplication(request: Request, response: Response) {
        try {
            const applicationRepository = AppDataSource.getRepository(Application);
            const application = await applicationRepository.findOne({ where: { id: Number(request.params.id) }, });
            if (!application) {
                return response.status(404).json({ message: "Application not found" });
            }
            application.status = ApplicationStatus.REJECTED;
            application.decisionDate = new Date();
            application.approvedVenue = null;
            application.rejectReason = request.body.commentText || "Application has been rejected";
            await applicationRepository.save(application);
            response.json({ application, message: "Application rejected successfully" });
        } catch (error) {
            response.status(500).json({ message: "Failed to reject application" });
        }
    }

    async updateComment(request: Request, response: Response) {
        try {
            const applicationId = Number(request.params.id);
            const { vendorId, commentText } = request.body;

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
            console.error(error);
            return response.status(500).json({ message: "Failed to save comment" });
        }
    }

    async getVendorApplications(request: Request, response: Response) {
        try {
            const vendorId = Number(request.params.vendorId);

            const applications = await this.applicationRepository.find({
                relations: [
                    "hirer",
                    "hirer.profile",
                    "applicationVenues",
                    "applicationVenues.venue",
                    "applicationVenues.venue.vendor",
                    "comments",
                    "approvedVenue"
                ]
            });

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
                hirerID: String(app.hirer.id),
                hirerEmail: app.hirer.email,
                status: app.status,
                approvedVenueID: app.approvedVenue?.id,

                comment:
                    app.comments.length > 0
                        ? app.comments[app.comments.length - 1].commentText
                        : "",

                reputationScore:
                    app.hirer.profile?.creditabilityScore || 0,
            }));

            return response.json(formattedApplications);

        } catch (error) {
            console.error(error);
            return response.status(500).json({
                message: "Failed to load applications"
            });
        }
    }

    async getVendorStats(req: Request, res: Response) {
        try {
            const VendorId = Number(req.params.vendorId);
            const period = req.query.period as string;

            const applications = await this.applicationRepository.find({
                relations: [
                    "hirer",
                    "hirer.profile",
                    "applicationVenues",
                    "applicationVenues.venue",
                    "applicationVenues.venue.vendor",
                    "approvedVenue"
                ]
            });

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
            const approvedApp = filteredByDecision.filter(app => app.status === ApplicationStatus.APPROVED);

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
            console.error(error);
            return res.status(500).json({
                message: "Failed to load stats"
            });
        }
    }
}