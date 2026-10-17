import { Venue } from "@/types/venues";
import { EventApplication } from "@/types/EventApplication";
import { BlockedPeriod } from "@/types/blockedPeriod";
import { HireHistory } from "@/types/hireHistory";
import { api, getCollection } from "./api";

export const vendorApi = {
    getApplications: async (vendorId: number) => {
        return getCollection<EventApplication>(`/applications/vendor/${vendorId}`);
    },

    getHireHistory: async () => {
        return getCollection<HireHistory>("/hire-history");
    },

    approveApplication: async (applicationId: number, commentText: string, venueId: number, vendorId: number) => {
        const response = await api.put(`/applications/${applicationId}/approve`, { commentText, venueId, vendorId });
        return response.data;
    },

    rejectApplication: async (applicationId: number, commentText: string) => {
        const response = await api.put(`/applications/${applicationId}/reject`, { commentText });
        return response.data;
    },

    updateComment: async (applicationId: number, vendorId: number, commentText: string) => {
        const response = await api.put(`/applications/${applicationId}/comment`,
            {
                vendorId, commentText
            }
        );
        return response.data;
    },

    getBlockedPeriods: async () => {
        return getCollection<BlockedPeriod>("/blocked-periods");
    },

    createdBlockedPeriod: async (data: {
        vendorId: number;
        venueId: number;   
        startDate: string;
        endDate: string;
        reason: string;
    }) => { 
        const response = await api.post("/blocked-periods", data);
        return response.data;   
    },

    removeBlockedPeriod: async (id: number) => {
        const response = await api.delete(`/blocked-periods/${id}`);
        return response.data;
    },

    getMyVenues: async (vendorId: number) => {
        return getCollection<Venue>(`/venues/vendor/${vendorId}`);
    },

    createVenue: async (venueData: Omit<Venue, "id" | "isFeatured"> & { suitabilities?: string[] }) => {
        const response = await api.post("/venues", venueData);
        return response.data;
    },

    updateVenue: async (venueId: number, venueData: Omit<Venue, "id" | "isFeatured"> & { suitabilities?: string[] }) => {
        const response = await api.put(`/venues/${venueId}`, venueData);
        return response.data;
    },

    deleteVenue: async (venueId: number, vendorId: number) => {
        const response = await api.delete(`/venues/${venueId}`, {data: {vendorId}});
        return response.data;
    },

    getVendorStats: async (vendorId: number, period: string) => {
        const response = await api.get(`/applications/vendor/${vendorId}/stats`,
            {
                params: { period }
            }
        );
        return response.data;
    }
};