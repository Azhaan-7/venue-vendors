import { SimpleGrid, Card, CardBody, Text, Image, VStack } from "@chakra-ui/react";
import { Venue } from "@/types/venues";
type VenueListProps = {
    venues: Venue[];
    selected: number[];
    toggleVenue: (id: number) => void;
    
};

// Venue list for hirers
// Shows all available venues as cards and lets the user pick or unpick them for their preferred list
export function VenueList({ venues, selected, toggleVenue }: VenueListProps) {
    // fallback message in case there are no venues to show, described in user story
    if (venues.length === 0){
        return <Text>No venues available at the moment</Text>
    }
    return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {venues.map((venue) => {
                // Checking if current venue is already in selected venues
                const isSelected = selected.includes(venue.id);
                return (
                    <Card
                        key={venue.id}
                        onClick={() => toggleVenue(venue.id)}
                        cursor={"pointer"}
                        role="button" tabIndex={0} aria-pressed={isSelected}
                        aria-label={`${isSelected ? "Deselect" : "Select"} ${venue.name}`}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleVenue(venue.id); } }}
                        _focusVisible={{ outline: "2px solid", outlineColor: "blue.600", outlineOffset: "2px" }}
                        borderWidth={"2px"}
                        borderColor={isSelected ? "blue.400" : "gray.200"}
                        bg={isSelected ? "blue.50" : "white"}
                        overflow={"hidden"}
                    >
                        <Image
                            src={venue.image}
                            alt={venue.name}
                            h="200px"
                            w="100%"
                            objectFit="cover"
                            />
                        <CardBody>
                            <VStack align="stretch" spacing={2}>
                                <Text fontWeight="bold" fontSize="lg">
                                    {venue.name}
                                </Text>
                            <Text>Location: {venue.location}</Text>
                            <Text>Capacity: {venue.capacity}</Text>
                            <Text>Price for 1 Day: ${venue.price}</Text>
                            <Text>Description: {venue.description}</Text>
                            <Text fontSize="sm" color="gray.600">
                                Suitable for: {venue.venueSuitabilities?.map(s => s.keyword).join(", ") || "N/A"}
                            </Text>
                            </VStack>
                        </CardBody>
                    </Card>
                )
            })}
        </SimpleGrid>
    )
}
