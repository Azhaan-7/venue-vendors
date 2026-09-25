"use client";
import { Box, VStack, Text, Heading } from "@chakra-ui/react";
import { EventApplication } from "../types/EventApplication";
import { Venue } from "../types/venues";


type Props = {
  applications: EventApplication[];
  venues: Venue[];
};

// Application history for hirers
// Displays all submitted applications along with their current status and selected venue preferences
export function ApplicationHistory({ applications, venues }: Props) {
  const getStatusStyles = (status: string) => {
    // returns different styling based on application status
    // approved = green, rejected = red, pending = yellow
    if (status === "approved") {
      return { bg: "green.50", borderColor: "green.200" };
    }
    if (status === "rejected") {
      return { bg: "red.50", borderColor: "red.200" };
    }
    return { bg: "yellow.50", borderColor: "yellow.200" };
  };

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>Your Application Submissions</Heading>

      <VStack spacing={4} align="stretch">
        {/* show fallback if user has not applied to anything yet, as per user story */}
        {applications.length === 0 && (
          <Text>No applications yet.</Text>
        )}

        {applications.map((app, index) => {
          const selectedVenues = app.venues
            .map(id => venues.find(v => v.id === id))
            .filter(v => v !== undefined);

          const approvedVenue = app.approvedVenueID
            ? venues.find(v => v.id === app.approvedVenueID)
            : undefined;

          const styles = getStatusStyles(app.status);

          return (
            <Box
              key={index}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              bg={styles.bg}
              borderColor={styles.borderColor}
            >
              <Text fontWeight="bold">
                Event: {app.event.eventName}
              </Text>
              <Text fontSize="sm" fontWeight="semibold">
                Status: {app.status.toUpperCase()}
              </Text>

              <Text>
                Date: {app.event.date}
              </Text>

              <Text>
                Time: {app.event.time}
              </Text>

              <Text>
                Guests: {app.event.guests}
              </Text>

              <Text>
                Duration: {app.event.duration} Hours
              </Text>

              <Text mt={2} fontWeight="semibold">
                Venue Preferences:
              </Text>

              <Box as="ol" pl={5} mt={1}>
                {selectedVenues.map((v, i) => (
                  <Text as="li" key={i}>
                    {v?.name} ({v?.location})
                  </Text>
                ))}
              </Box>
              {app.status === "approved" && approvedVenue && (
                <Box mt={2} p={3} rounded="md" border="1px solid" borderColor="green.300" bg="green.100">
                  <Text fontSize="sm" fontWeight="bold">
                    Confirmed Venue:
                  </Text>
                  <Text fontSize="sm">
                    {approvedVenue.name} ({approvedVenue.location})
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}