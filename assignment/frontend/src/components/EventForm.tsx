import React, { useState } from "react";
import { EventDetails } from "../types/EventApplication";
import { Box, VStack, FormControl, FormLabel, Input, Button, Heading, useToast } from "@chakra-ui/react";
type EventFormProps = {
    event: EventDetails;
    setEvent: React.Dispatch<React.SetStateAction<EventDetails>>;
    //uses api now
    saveEvent: () => Promise<boolean>;
    //changed apply event to now use api, hence promise
    applyEvent: () => Promise<boolean>;
};

// Event form for hirers
// Lets the user enter event info, save it as a draft, and then submit an application if everything is valid
export function EventForm({ event, setEvent, saveEvent, applyEvent }: EventFormProps) {
    const toast = useToast();
    const [pending, setPending] = useState<"save" | "apply" | null>(null);
    return (
        <Box p={{ base: 4, md: 6 }} borderWidth="1px" borderRadius="lg" bg="white">
            <Heading size={"md"} mb={4}>Your Event</Heading>
            <VStack spacing={4}>
                <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input
                        value={event.eventName}
                        onChange={(e) => setEvent({ ...event, eventName: e.target.value })}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Guests</FormLabel>
                    <Input
                        type="number"
                        value={event.guests}
                        onChange={(e) => setEvent({ ...event, guests: Number(e.target.value) })}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Date</FormLabel>
                    <Input
                        type="date"
                        value={event.date}
                        onChange={(e) => setEvent({ ...event, date: e.target.value })}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Time</FormLabel>
                    <Input
                        type="time"
                        value={event.time}
                        onChange={(e) => setEvent({ ...event, time: e.target.value })}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Duration in Hours</FormLabel>
                    <Input
                        type="number"
                        step={1}
                        min={1}
                        value={event.duration}
                        onChange={(e) => setEvent({ ...event, duration: Number(e.target.value) })}
                    />
                </FormControl>
                <Button
                    colorScheme="blue"
                    isLoading={pending === "save"} isDisabled={pending === "apply"} loadingText="Saving draft"
                    onClick={async () => {
                        setPending("save");
                        try {
                        const success = await saveEvent();

                        if (success) {
                            toast({
                                title: "Event draft saved.",
                                description: "Your event details have been saved for later.",
                                status: "success",
                                duration: 2500,
                                isClosable: true,
                            });
                        }
                        } finally { setPending(null); }
                    }}
                >
                    Save event draft
                </Button>
                <Button
                    isLoading={pending === "apply"} isDisabled={pending === "save"} loadingText="Submitting application"
                    //async function for api
                    onClick={async () => {
                        setPending("apply");
                        try {
                        const success = await applyEvent();

                        if (success) {
                            // only show success if it actually went through
                            toast({
                                title: "Application submitted",
                                description: "Your application has been submitted successfully.",
                                status: "success",
                                duration: 3000,
                                isClosable: true,
                            });
                        }
                        } finally { setPending(null); }
                    }}
                >
                    Apply for Venue
                </Button>
            </VStack>
        </Box>
    );
}
