import { Box, VStack, Text, Heading } from "@chakra-ui/react";
import { HireHistory } from "../types/hireHistory";

type Props = {
  history: HireHistory[];
};

export function HirerHistory({ history }: Props) {
  return (
    <Box p={{ base: 4, md: 6 }} borderWidth="1px" borderRadius="lg" bg="white">
      <Heading size="md" mb={4}>Your Hiring History</Heading>

      <VStack spacing={4} align="stretch">

        {history.length === 0 && (
          <Text>No hiring history yet.</Text>
        )}

        {history.map((h) => (
          <Box key={h.id} p={4} borderWidth="1px" borderRadius="md">

            <Text fontWeight="bold">
              Event: {h.eventName}
            </Text>

            <Text>
              Venue: {h.venue.venueName} ({h.venue.location})
            </Text>

            <Text>
              Date: {h.eventDate}
              Time: {h.eventName}
            </Text>

            <Text>
              Rating: {h.rating} / 5
            </Text>

            <Text mt={2} fontWeight="semibold">
              Documents:
            </Text>

            {h.documents.length > 0 ? (
              h.documents.map((doc, i) => (
                <Text key={i}>- {doc}</Text>
              ))
            ) : (
              <Text>- None</Text>
            )}

          </Box>
        ))}

      </VStack>
    </Box>
  );
}