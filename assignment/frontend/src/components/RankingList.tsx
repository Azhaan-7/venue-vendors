import { VStack, HStack, Button, Text, Box, Heading } from "@chakra-ui/react";
import { Venue } from "@/types/venues";

type RankingListProps = {
    selectedVenues: Venue[];
    moveUp: (index: number) => void;
    moveDown: (index: number) => void;
};

// Ranking list for selected venues
// Shows the hirer's chosen venues in order and lets them move items up or down to change preference
export function RankingList ({ selectedVenues, moveUp, moveDown} : RankingListProps){
    // if nothing has been selected yet there is nothing to rank, as described in user story
    if (selectedVenues.length === 0){
            return <Text><b>No venues ranked at the moment</b></Text>
        }
    return (
        <Box mt={6}>
            <Heading size={"md"} mb={3}> Rank Your Choices</Heading>
            <VStack spacing={3} align={"stretch"}>
                {selectedVenues.map((venue, index) => (
                    <HStack
                        key={venue.id}
                        p={3}
                        borderWidth={"1px"}
                        borderRadius={"md"}
                        justify={"space-between"}
                        flexWrap="wrap" gap={3} bg="white"
                        >
                            <Text>
                                {index+1}. {venue.name}
                            </Text>
                            <HStack>
                                <Button
                                    size="sm"
                                    onClick={() => moveUp(index)}
                                    isDisabled={index === 0}
                                >
                                    Up    
                                </Button>
                                <Button 
                                size={"sm"}
                                onClick={() => moveDown(index)}
                                isDisabled={index===selectedVenues.length - 1}
                                > Down</Button>
                            </HStack>
                        </HStack>
                ))}
            </VStack>
        </Box>
    )
}
