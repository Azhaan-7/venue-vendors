export type EventDetails = {
    eventName: string;
    guests: number;
    date: string;
    time: string;
    duration: number;
};

export type EventApplication = {
    id?: number;
    event: EventDetails;
    venues: number[];
    dateApplied: string;
    hirerID: number;
    hirerEmail: string;
    status: "pending" | "approved" | "rejected";
    rating?: number;
    comment?: string;
    reputationScore?: number;
    approvedVenueID?: number;
};

    