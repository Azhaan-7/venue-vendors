import React from "react";
import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ApplicationHistory } from "./ApplicationHistory";
import { EventApplication } from "../types/EventApplication";
import { venues } from "@/types/venues";

function renderComponent(ui: React.ReactElement) {
    return render(<ChakraProvider>{ui}</ChakraProvider>);
}

describe("ApplicationHistory", () => {
    test("A venue should be confirmed when an application has been approved", () => {
        const applications: EventApplication[] = [
            {
                event: {
                    eventName: "App1",
                    guests: 120,
                    date: "2026-05-10",
                    time: "18:00",
                    duration: 4,
                },
                venues: [1, 2],
                dateApplied: "2026-04-19T10:00:00.000Z",
                hirerID: "h1",
                status: "approved",
                approvedVenueID: 2,
            },
        ];
        const approvedVenue = venues.find(
            (v) => v.id === applications[0].approvedVenueID
        );
        expect(approvedVenue).toBeDefined();

        const approvedVenueText = `${approvedVenue!.name} (${approvedVenue!.location})`;

        renderComponent(<ApplicationHistory applications={applications} />);

        expect(screen.getByText("Confirmed Venue:")).toBeInTheDocument();
        expect(screen.getAllByText(approvedVenueText)).toHaveLength(2);
    });

    test("There should not be a confirmed venue while the application is still pending", () => {
        const applications: EventApplication[] = [
            {
                event: {
                    eventName: "App2",
                    guests: 75,
                    date: "2026-06-01",
                    time: "14:00",
                    duration: 3,
                },
                venues: [1, 5],
                dateApplied: "2026-04-19T11:00:00.000Z",
                hirerID: "h2",
                status: "pending",
            },
        ];

        renderComponent(<ApplicationHistory applications={applications} />);

        expect(screen.queryByText("Confirmed Venue:")).not.toBeInTheDocument();
    });
});