import { api, applicationApi } from "./api";

export const vendorApi = {
    getApplications: async (vendorId: number) => {
        const response = await api.get(`/applications/vendor/${vendorId}`);
        return response.data;
    },

    getHireHistory: async () => {
        const response = await api.get("/hire-history"); 
        return response.data;
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
        const response = await api.get("/blocked-periods");
        return response.data;
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
        const response = await api.get(`/venues/vendor/${vendorId}`);
        return response.data;
    },

    createVenue: async (venueData: any) => {
        const response = await api.post("/venues", venueData);
        return response.data;
    },

    updateVenue: async (venueId: number, venueData: any) => {
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