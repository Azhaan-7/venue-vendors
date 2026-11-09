// Hirer page for Venue Vendors.
// This page allows the hirer to manage profile details, save event drafts,
// browse and rank venues, submit booking applications, and review
// submitted applications and hiring history.
// All hirer data is stored in database as required by the specification.


"use client";
import { useEffect, useState } from "react";
import { Profile } from "../types/profiles";
import { Box, VStack, Text, Input, Alert, AlertIcon, useToast, Spinner } from "@chakra-ui/react";
import { ProfileForm } from "../components/ProfileForm";
import { VenueList } from "../components/VenueList";
import { RankingList } from "../components/RankingList";
import { Venue } from "../types/venues";
import { EventForm } from "../components/EventForm";
import { EventDetails, EventApplication } from "../types/EventApplication";
import { ApplicationHistory } from "../components/ApplicationHistory";
import { useAuth } from "../context/AuthContext";
import { HireHistory } from "../types/hireHistory";
import { HirerHistory } from "@/components/hireHistoryComponent";
import { BlockedPeriod } from "@/types/blockedPeriod";
import { validateProfile } from "@/types/profileValidation";
//adding application api, changing applications stored in local storage to instead use api and database
import { applicationApi, authApi, getCollection, applicationDraftApi } from "@/services/api";
import { isFutureVenueEvent } from "@/utils/venueTime";
import { requestError } from "@/utils/requestError";
import { useRouter } from "next/router";
export default function Hiring() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const toast = useToast();
    // Page-level state is kept here and not in component files because this file coordinates the full hirer
    // workflow and passes smaller pieces of data to the components in src/components
    const [applications, setApplications] = useState<EventApplication[]>([]);
    //getting the venues from database now instead of hard coded values
    const [venues, setVenues] = useState<Venue[]>([]);
    const [search, setSearch] = useState("");
    const [selectedID, setSelectedID] = useState<number[]>([]);
    //getting hire history from db
    const [hireHistory, setHireHistory] = useState<HireHistory[]>([]);
    //loading blocked periods defined by vendors from db:
    const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
    const [profile, setProfile] = useState<Profile>({
        name: "",
        phoneNumber: "",
        isBusiness: false,
        abn: "",
        driverLicense: undefined,
        publicLiabilityInsurance: undefined,
        businessRegistration: undefined,
        credibilityScore: 0
    });
    const [event, setEvent] = useState<EventDetails>({
        eventName: "",

        guests: 0,
        date: "",
        time: "",
        duration: 0
    });
    const [errors, setErrors] = useState<string[]>([]);
    const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
    const [venuesLoading, setVenuesLoading] = useState(true);

    useEffect(() => {
        if (isLoading) return;
        if (!user) void router.replace("/signin");
        else if (user.role !== "hirer") void router.replace("/");
    }, [isLoading, router, user]);


    useEffect(() => {
        async function loadApplicationDraft() {
            if (!user) return;

            try {
                const draft = await applicationDraftApi.getDraft(user.id);
                if (!draft) return;
                setEvent(draft.event);
                setSelectedID(draft.venues);

                if (
                    draft.event.eventName !== "" ||
                    draft.event.guests > 0 ||
                    draft.event.date !== "" ||
                    draft.event.time !== "" ||
                    draft.event.duration > 0 ||
                    draft.venues.length > 0
                ) {
                    toast({ title: "Welcome back", description: "Your previous event draft has been restored.", status: "success", duration: 3000, isClosable: true });
                }
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, draft: requestError(error, "Could not load draft. Please try again.") }));
            }
        }
        loadApplicationDraft();
    }, [user, toast]);

    // Load saved profile data for the current user.
    // A user-specific key ensures each hirer sees only their own profile information.
    useEffect(() => {
        async function fetchProfile() {
            if (!user) return;

            try {
                const data = await authApi.getProfile(user.id);

                setProfile(previous => ({
                    ...previous,
                    name: data.name || "",
                    phoneNumber: data.phoneNumber || "",
                    isBusiness: data.isBusiness || false,
                    abn: data.abn || "",
                    credibilityScore: Number(data.credibilityScore || data.creditabilityScore || 0),
                }));
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, profile: requestError(error, "Could not load profile. Please try again.") }));
            }
        }
        fetchProfile();
    }, [user]);
    // Load all applications from API on first render.
    // Applications are later filtered by hirer ID before being shown in ApplicationHistory.
    useEffect(() => {
        //updated useeffect to use async functions for api, try catch to report errors if any
        async function fetchApplications() {
            if (!user) {
                return;
            }

            try {
                const data = await applicationApi.hirerApplications(user.id);
                setApplications(data);
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, applications: requestError(error, "Could not load applications. Please try again.") }));
            }
        }

        fetchApplications();
    }, [user]);


    //loading venue from backend
    useEffect(() => {
        const loadVenue = async () => {
            try {
                setVenues(await getCollection<Venue>("/venues"));
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, venues: requestError(error, "Could not load venues. Please try again.") }));
            } finally {
                setVenuesLoading(false);
            }
        };
        loadVenue();
    }, []);
    //loading in hire history
    useEffect(() => {
        const loadHireHistory = async () => {
            if (!user) return;
            try {
                setHireHistory(await getCollection<HireHistory>("/hire-history"));
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, history: requestError(error, "Could not load history. Please try again.") }));
            }
        };
        loadHireHistory();
    }, [user]);
    useEffect(() => {
        const loadBlockedPeriods = async () => {
            if (!user) return;
            try {
                setBlockedPeriods(await getCollection<BlockedPeriod>("/blocked-periods"));
            } catch (error) {
                setLoadErrors(previous => ({ ...previous, availability: requestError(error, "Could not load availability. Please try again.") }));
            }
        };

        loadBlockedPeriods();
    }, [user]);

    if (!user) {
        return null;
    }
    // Toggle venue selection for ranking and event application.
    // Click once to add the venue, and click again to remove it.
    function toggleSelect(id: number) {
        if (selectedID.includes(id)) {
            setSelectedID(
                selectedID.filter((v) => v !== id)
            );
            // if already selected then deselect 
        }
        else {
            setSelectedID([...selectedID, id]);
        }
    }
    //Function to move particular venue one position higher in preference list
    function moveUp(index: number) {
        if (index === 0) return;

        const newArr = [...selectedID];
        [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
        setSelectedID(newArr);
    }
    //Function to move particular venue one position lower in preference list
    function moveDown(index: number) {
        if (index === selectedID.length - 1) return;

        const newArr = [...selectedID];
        [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
        setSelectedID(newArr);
    }

    //Validating the event application's information fields and venue choices
    //Rules:
    // 1) Event name cannot be empty.
    // 2) Number of guests must be greater than 0.
    // 3) Date and time must br provided, and cannot be in the past(current time used as reference).
    // 4) Event duration has to be more than 0 Hours, and must be entered as a positive integer.
    // 5) At least one venue must be selected.
    // 6) Selected venues must all have sufficient capacity.
    // 7) Selected venues can't be chosen if they are blocked for the particular date.

    function validateEventApplication(): boolean {
        const newErrors: string[] = [];
        if (event.eventName.trim() === "") {
            newErrors.push("Event name is required");
        }
        if (event.guests <= 0) {
            newErrors.push("Guests must be greater than 0");
        }
        if (event.date === "") {
            newErrors.push("Date is required");
        }
        if (event.time === "") {
            newErrors.push("Time is required");
        }
        if (event.date !== "" && event.time !== "") {
            if (!isFutureVenueEvent(event.date, event.time)) {
                newErrors.push("Event date and time cannot be in the past");
            }
        }
        if (!event.duration || event.duration <= 0) {
            newErrors.push("Duration must be greater than 0");
        }
        if (!Number.isInteger(event.duration)) {
            newErrors.push("Duration must be a whole number");
        }
        if (selectedID.length === 0) {
            newErrors.push("Select at least one venue");
        }

        // Convert selected venue IDs into venue objects so capacity and availability can be checked
        const selectedVenues = selectedID
            .map(id => venues.find(v => v.id === id))
            .filter(v => v !== undefined) as Venue[];

        selectedVenues.forEach(v => {
            if (event.guests > v.capacity) {
                newErrors.push(
                    `Guests exceed capacity for ${v.name}`
                );
            }
        });

        // Load vendor-defined blocked periods from database.
        // Prevent submission if a selected venue is unavailable on the chosen date.

        selectedVenues.forEach(v => {
            const blocked = blockedPeriods.find((block) => {
                if (block.venueId !== v.id) return false;

                const eventDate = new Date(event.date);
                const start = new Date(block.startDate);
                const end = new Date(block.endDate);

                return eventDate >= start && eventDate <= end;
            });

            if (blocked) {
                newErrors.push(`${v.name} is unavailable on this date.`);
                newErrors.push(`Reason: ${blocked.reason}`);
                newErrors.push(`Please de-select ${v.name}`);
            }
        });
        setErrors(newErrors);
        return newErrors.length === 0;
    }


    // Submit an application only after profile and event validation succeed.
    // On success, save the application, reset the form, and clear the saved draft.
    async function applyEvent(): Promise<boolean> {
        const profileErrors = validateProfile(profile);

        if (Object.keys(profileErrors).length > 0) {
            setErrors(Object.values(profileErrors).filter(Boolean) as string[]);
            return false;
        }
        if (!validateEventApplication()) return false;
        if (!user) {
            alert("You must be logged in");
            return false;
        }
        const newApp: EventApplication = {
            event,
            venues: selectedID,
            dateApplied: new Date().toISOString(),
            hirerID: user.id,
            status: "pending",
            hirerEmail: user.email,
        };

        try {
            const savedApp = await applicationApi.createApplication(newApp);

            setApplications([...applications, savedApp]);

            setEvent({
                eventName: "",
                guests: 0,
                date: "",
                time: "",
                duration: 0
            });

            setSelectedID([]);
            setErrors([]);
            try {
                await applicationDraftApi.deleteDraft(user.id);
            } catch (error) {
                toast({ title: "Application submitted; draft cleanup failed.", description: requestError(error, "Your application is saved. The old draft may reappear next time."), status: "warning", isClosable: true });
            }

            return true;
        } catch (error) {
            setErrors([requestError(error, "Application could not be submitted. Please try again.")]);
            return false;
        }
    }
    // Split the search input by spaces so multiple terms can be matched separately.
    // This supports combined searches described in the user story.
    const terms = search.toLowerCase().trim().split(" ");

    // Split the search input by spaces so multiple terms can be matched separately.
    // This supports combined searches described in the user story.
    const filteredVenues = venues.filter(v => {
        if (terms.length === 0) return true;

        return terms.every(term =>
            v.name.toLowerCase().includes(term) ||
            v.location.toLowerCase().includes(term) ||
            (!isNaN(Number(term)) && v.capacity >= Number(term)) ||
            v.venueSuitabilities?.some(s =>
                s.keyword.toLowerCase().includes(term)
            )
        );
    });
    // Show only venues where every search term matches at least one attribute:
    // name, location, minimum capacity, or recommended suitability.
    const noSearchMatch = search.trim() !== "" && filteredVenues.length === 0;
    const orderedApplications = applications
        .filter(app => app.hirerID === user?.id)
        .sort((a, b) =>
            ["pending", "approved", "rejected"].indexOf(a.status) -
            ["pending", "approved", "rejected"].indexOf(b.status)
        );

    const featuredVenues = filteredVenues.filter((venue) => venue.isFeatured);
    const normalVenues = filteredVenues.filter((venue) => !venue.isFeatured);


    return (
        <Box px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
            <VStack spacing={6} align="stretch">
                {Object.entries(loadErrors).map(([key, message]) => <Alert key={key} status="error" borderRadius="md"><AlertIcon />{message}</Alert>)}

                <ProfileForm
                    profile={profile}
                    setProfile={setProfile}
                    email={user.email}
                    userId={user.id}
                    saveProfile={async (updatedProfile) => {
                        if (!user) return;
                        const saved = await authApi.updateProfile(user.id, {
                            name: updatedProfile.name,
                            phoneNumber: updatedProfile.phoneNumber,
                            isBusiness: updatedProfile.isBusiness,
                            abn: updatedProfile.abn,
                        });
                        setProfile(previous => ({ ...previous, credibilityScore: Number(saved.creditabilityScore || 0) }));
                    }}
                />

                <EventForm
                    event={event}
                    setEvent={setEvent}
                    saveEvent={async () => {
                        if (!user) return false;

                        if (!validateEventApplication()) {
                            return false;
                        }

                        try {
                            await applicationDraftApi.saveDraft(user.id, event, selectedID);
                            return true;
                        } catch (error) {
                            setErrors([requestError(error, "Application draft could not be saved. Please try again.")]);
                            return false;
                        }
                    }}
                    applyEvent={applyEvent}
                />
                {errors.length > 0 && (
                    <Alert status="error" borderRadius="lg" alignItems="start">
                        <AlertIcon mt={1} />
                        <Box>
                            <Text fontWeight="bold" mb={1}>
                                Please fix the following:
                            </Text>
                            <VStack align="stretch" spacing={1}>
                                {errors.map((err) => (
                                    <Text key={err}>• {err}</Text>
                                ))}
                            </VStack>
                        </Box>
                    </Alert>
                )}
                <Text fontSize="sm" color="gray.600">
                    You can search using a combination of multiple terms including venue name, location, minimum capacity, or suitability.
                    Example: 150 Corporate Events
                </Text>
                <Input
                    aria-label="Search venues"
                    placeholder="Search venues"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)} />
                {venuesLoading && <Text as="div" role="status"><Spinner size="sm" mr={2} />Loading venues…</Text>}
                {!venuesLoading && !loadErrors.venues && noSearchMatch && <Text>No venues found.</Text>}

                {!venuesLoading && !loadErrors.venues && !noSearchMatch && (
                    <>
                        {featuredVenues.length > 0 && (
                            <>
                                <Text fontSize="xl" fontWeight="bold">
                                    Featured Venues
                                </Text>

                                <VenueList
                                    venues={featuredVenues}
                                    selected={selectedID}
                                    toggleVenue={toggleSelect}
                                />
                            </>
                        )}

                        <Text fontSize="xl" fontWeight="bold">
                            Venues:
                        </Text>

                        <VenueList
                            venues={normalVenues}
                            selected={selectedID}
                            toggleVenue={toggleSelect}
                        />
                    </>
                )}

                <RankingList
                    selectedVenues={
                        selectedID
                            .map(id => venues.find(v => v.id === id))
                            .filter(v => v !== undefined) as Venue[]
                    }

                    moveUp={moveUp}
                    moveDown={moveDown}
                />
                {!loadErrors.applications && <ApplicationHistory
                    applications={orderedApplications}
                    venues={venues} />}
                {!loadErrors.history && <HirerHistory
                    history={hireHistory.filter(h => user && h.hirer.id === user.id)}
                />}

            </VStack>
        </Box>
    );
}
