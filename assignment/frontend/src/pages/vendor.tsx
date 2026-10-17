import { requestError } from "@/utils/requestError";
import {
  Box, Heading, VStack, Text, Button, HStack, Badge, Divider, Alert, AlertIcon, useDisclosure, Table,
  Thead, Tbody, Tfoot, Tr, Th, Td, TableContainer, FormControl, FormLabel, Select, FormErrorMessage, Input, Textarea, Spinner} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { StarRating } from "@/components/StarRating";
import Head from "next/head";
import { EventApplication } from "@/types/EventApplication";
import { Venue } from "@/types/venues";
import { Profile } from "@/types/profiles";
import { BlockedPeriod } from "@/types/blockedPeriod";
import { vendorApi } from "@/services/VendorApi";
import { HireHistory } from "@/types/hireHistory";
import { api, hirerDocumentApi } from "@/services/api";
import VendorApplicationModal from "@/components/VendorApplicationModal";
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement,  Tooltip, Legend } from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

//Register ChartJS components
ChartJs.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

//Required documents
const REQUIRED_DOCUMENTS = ["Driver's License","Public Liability Insurance","Business Registration",];

type DashboardStats = {
  venueTallies: Record<string, Record<string, number>>;
  combinedTallies: Record<string, number>;
  mostActive: {
    hirerId: number;
    name: string;
    count: number;
  } | null;
  leastActive: {
    hirerId: number;
    name: string;
    count: number;
  } | null;
  venueUtilization: Record<string, Record<string, number>>;
};

export default function Vendor() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<EventApplication[]>([]);
  //stores the application that the vendor selects. stays null until the application is selected and gets set when the application is selected
  const [selectedApplication, setSelectedApplication] = useState<EventApplication | null>(null);
  //stores the comment that the vendor is typing and updates 
  const [comment, setComment] = useState("");
  //shows approve or reject in main page
  const [pageMessage, setPageMessage] = useState("");
  //shows after saving the comment
  const [modalMessage, setModalMessage] = useState("");
  //shows if something is wrong like if the venue is already booked for the same date
  const [errorMessage, setErrorMessage] = useState("");
  //shows when the vendor is will to approve or reject
  const [showActions, setShowActions] = useState(false);
  //controls the tab that should be visible 
  const [activeTab, setActiveTab] = useState<"applicants" | "history" | "blockedVenue" | "dashboard" | "venues">("applicants");
  //editing comment
  const [editComment, setEditComment] = useState(false);
  //for selected venue
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  // blocking a venue
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [blockVenueName, setBlockVenueName] = useState("");
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockMessage, setBlockMessage] = useState("");
  const [blockError, setBlockError] = useState(false);
  const [blockErrors, setBlockErrors] = useState<{ [key: string]: string }>({});
  //sorting the application
  const [sortBy, setSortBy] = useState<"default" | "reputation">("default");
  const [directionSort, setDirectionSort] = useState<"desc" | "asc">("desc");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hireHistory, setHireHistory] = useState<HireHistory[]>([]);
  //for profile 
  const [profiles, setProfiles] = useState<Record<number, Profile>>({});
  const [venues, setVenues] = useState<Venue[]>([]);
  //creating venue forms
  const [venueName, setVenueName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [suitabilityText, setSuitabilityText] = useState("");
  const [editingVenue, setEditingVenue] = useState<Venue|null>(null);
  const [period, setPeriod] = useState<"all" | "week" | "month" | "lastMonth">("all");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  const refreshError = (error: unknown, resource: string) => {
    setLoadErrors(previous => ({ ...previous, [resource]: `Changes saved, but ${resource} could not refresh. ${requestError(error, "Please reload the page.")}` }));
  };

  //redirecting page
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/signin");
    } else if (user.role !== "vendor") {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const loadProfiles = async () => {
      if (!selectedApplication) return;
      try {
        const profileMap: { [key: number]: Profile } = {};
        for (const hirerId of [selectedApplication.hirerID]) {
          const profileResponse = await api.get(`/profile/${hirerId}`);
          const documents = await hirerDocumentApi.getDocuments(hirerId);
          const profileData = profileResponse.data;
          const fullProfile: Profile = {
            ...profileData,
            credibilityScore: Number(
              profileData.credibilityScore ??
              profileData.creditabilityScore ??
              0),};
          documents.forEach((doc) => {
            const uploadedFile = {
              name: doc.fileName,
              type: doc.mimeType,
              size: 0,
              data: doc.downloadUrl,
            };
            if (doc.documentType === "driverLicense") {
              fullProfile.driverLicense = uploadedFile;
            }
            if (doc.documentType === "publicLiabilityInsurance") {
              fullProfile.publicLiabilityInsurance = uploadedFile;
            }
            if (doc.documentType === "businessRegistration") {
              fullProfile.businessRegistration = uploadedFile;
            }
          });
          profileMap[hirerId] = fullProfile;
        }
        setProfiles(previous => ({ ...previous, ...profileMap }));
      } catch (error) {
        setLoadErrors(previous => ({ ...previous, "profiles": requestError(error, "Could not load the applicant profile and documents.") }));
      }
    };
    void loadProfiles();
  }, [selectedApplication]);

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) return;
      setApplicationsLoading(true);
      try {
        const data = await vendorApi.getApplications(user.id);
        setApplications(data);
      } catch (error) {
        setLoadErrors(previous => ({ ...previous, "applications": requestError(error, "Could not load applications.") }));
      } finally {
        setApplicationsLoading(false);
      }
    };
    loadApplications();
  }, [user]);

  useEffect(() => {
    const loadBlockedPeriods = async () => {
      try {
        const data = await vendorApi.getBlockedPeriods();
        setBlockedPeriods(data);
      } catch (error) {
        setLoadErrors(previous => ({ ...previous, "blocked periods": requestError(error, "Could not load blocked periods.") }));
      }
    };
    loadBlockedPeriods();
  }, [user]);

  useEffect(() => {
    const loadHireHistory = async () => {
      try {
        const data = await vendorApi.getHireHistory();
        setHireHistory(data);
      } catch (error) {
        setLoadErrors(previous => ({ ...previous, "hire history": requestError(error, "Could not load hire history.") }));
      }
    };
    loadHireHistory();
  }, [user]);
  //loading venue from backend
  useEffect(() => {
    const loadVenue = async() => {
      try {
        if (!user) return;
        const venues = await vendorApi.getMyVenues(user.id);
        setVenues(venues);
      } catch (error) {
        setLoadErrors(previous => ({ ...previous, "venues": requestError(error, "Could not load venues.") }));
      }
    };
    loadVenue();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
        const data =
            await vendorApi.getVendorStats(user.id, period);
        setDashboardStats(data);
    };
    void loadStats().catch(error => setLoadErrors(previous => ({ ...previous, statistics: requestError(error, "Could not load dashboard statistics.") })));
}, [user, period]);

  const getHirerProfile = (hirerId: number): Profile => {
    return (profiles[hirerId] || {name: "Unknown", phoneNumber: "Unknown", isBusiness: false, abn: "", credibilityScore: 0});
  };

  const getHirerEmail = (hirerId: number): string => {
    const application = applications.find(
      (app) => app.hirerID === hirerId
    );
    return application?.hirerEmail || "Unknown";
  };

  const getVenueName = (venueId: number): string => {
    return venues.find(v => v.id === venueId)?.name || "Unknown";
  }

  const getVenueLocation = (venueId: number): string => {
    return venues.find(v => v.id === venueId)?.location || "Unknown";
  }

  const getHireHistory = (hirerId: number): HireHistory[] => {
    return hireHistory.filter((h) => Number(h.hirer.id) === Number(hirerId));
  };
  //function to get the summary of the hire history like total events, unique locations and average rating
  const getHistorySummary = (hirerId: number) => {
    const history = getHireHistory(hirerId);
    const totalEvents = history.length;
    const uniqueLocations = new Set(history.map((h) => h.venue.location)).size;
    const avgRating =
      totalEvents === 0
        ? 0
        : history.reduce((sum, h) => sum + h.rating, 0) / totalEvents;
    return { totalEvents, uniqueLocations, avgRating: avgRating.toFixed(1) };
  };

  //function to get the reputation score of the hirer based on the average rating of the hire history. if there is no hire history, it will return the reputation score from the application. if there is no reputation score in the application, it will return null
  const getReputation = (app: EventApplication): number | null => {
    if (!app) return null;
    const history = getHireHistory(app.hirerID);
    if (!Array.isArray(history)) return null;
    if (history.length > 0) {
      let total = 0;
      for (let i = 0; i < history.length; i++) {
        total = total + history[i].rating;
      }
      return Math.round(total / history.length);
    }
    if (app.reputationScore !== undefined) {
      return app.reputationScore;
    }
    return null;
  };

  //function to sort the application based on the reputation score.
  const sortApplication = [...applications].sort((a, b) => {
    if (sortBy !== "reputation") return 0;
    const scoreA = getReputation(a);
    const scoreB = getReputation(b);
    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1;
    if (scoreB === null) return -1;
    return directionSort === "desc" ? scoreB - scoreA : scoreA - scoreB;
  });

  const isVenueBlocked = (venueId: number, eventDate: string): boolean => {
    return blockedPeriods.some((block) => {
      if (block.venueId !== venueId) return false;
      const event = new Date(eventDate);
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      return event >= start && event <= end;
    });
  };

  const getBlockReason = (venueId: number, eventDate: string): string => {
    const block = blockedPeriods.find((b) => {
      if (b.venueId !== venueId) return false;
      const event = new Date(eventDate);
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      return event >= start && event <= end;
    });
    return block?.reason || "";
  };
  //when the vendor clicks on the application, it will show the details of the application selected
  const handleSelectApplication = (app: EventApplication) => {
    setSelectedApplication(app);
    setComment(app.comment || "");
    setShowActions(false);
    setEditComment(false);
    setSelectedVenueId(null);
    setModalMessage("");
    setErrorMessage("");
    onOpen();
  };
  //when the vendor clicks act on the application button, it will show the approve and reject button
  const handleActOnApplication = () => {
    setShowActions(true);
    setEditComment(false);
  };
  //when the vendor clicks edit comment, it will show the textarea to edit the comment
  const handleEditComment = () => {
    setEditComment(true);
    setModalMessage("");
  };
//option to cancel the edit
  const handleCancelEdit = () => {
    setEditComment(false);
    setComment(selectedApplication?.comment || "");
    setModalMessage("");
  };
  //saving the comment
  const saveComment = async () => {
    if (!selectedApplication?.id || !user) return;

    if (!comment.trim()) {
      setModalMessage("No changes made — comment was empty.");
      return;
    }
    setErrorMessage("");
    setModalMessage("");
    try {
      await vendorApi.updateComment(selectedApplication.id, user.id, comment);
      const updatedApplications = await vendorApi.getApplications(user.id).catch(error => { refreshError(error, "applications"); return applications; });
      setApplications(updatedApplications);
      const updatedSelected = updatedApplications.find((app) => app.id === selectedApplication.id);
      if (updatedSelected) {
        setSelectedApplication(updatedSelected);
      }
      setModalMessage("Comment saved successfully");
      setEditComment(false);
    } catch (error) {
      setErrorMessage(requestError(error, "Failed to save comment."));
    }
  };

  const validateBlockForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!blockVenueName) errors.venueName = "Please select a venue.";
    if (!blockStartDate) errors.startDate = "Please select a start date.";
    if (!blockEndDate) errors.endDate = "Please select an end date.";
    if (!blockReason.trim()) errors.reason = "Please enter a reason.";
    if (blockStartDate && blockEndDate) {
      if (new Date(blockEndDate) < new Date(blockStartDate)) {
        errors.endDate = "End date cannot be before start date.";
      }
    }
    setBlockErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleBlockedVenue = async () => {
    setBlockError(false);
    if (!validateBlockForm()) return;
    if (!user?.id) {
      setBlockError(true);
      setBlockMessage("Unable to identify vendor.");
      return;
    }

    try {
      const venue = venues.find(v => v.name === blockVenueName);
      if (!venue) {
        setBlockError(true);
        setBlockMessage("Selected venue not found.");
        return;
      }
      await vendorApi.createdBlockedPeriod({
        vendorId: user.id,
        venueId: venue.id,
        startDate: blockStartDate,
        endDate: blockEndDate,
        reason: blockReason
      });
      const updatedBlockedPeriod = await vendorApi.getBlockedPeriods().catch(error => { refreshError(error, "blocked periods"); return blockedPeriods; });
      setBlockedPeriods(updatedBlockedPeriod);
      setBlockVenueName("");
      setBlockStartDate("");
      setBlockEndDate("");
      setBlockReason("");
      setBlockErrors({});
      setBlockMessage(`${blockVenueName} has been blocked successfully from ${blockStartDate} to ${blockEndDate}.`);
    } catch (error) {
      setBlockError(true);
      setBlockMessage(requestError(error, "Could not block the venue."));
    }
  };

  const handleRemoveBlock = async (id: number) => {
    setBlockError(false);
    try {
      await vendorApi.removeBlockedPeriod(id);
      const updatedBlockedPeriod = await vendorApi.getBlockedPeriods().catch(error => { refreshError(error, "blocked periods"); return blockedPeriods; });
      setBlockedPeriods(updatedBlockedPeriod);
      setBlockMessage("Blocked period removed successfully.");
    } catch (error) {
      setBlockError(true);
      setBlockMessage(requestError(error, "Failed to remove blocked period."));
    }
  };

  //function to approve the application and save the comment and selected venue. also checks if the venue is already booked for the same date or not
  const approve = async () => {
    if (!selectedApplication?.id) return;
    if (!user) return;
    //vendor must select a venue 
    if(!selectedVenueId) {
      setErrorMessage("Select a venue to approve.");
      return;
    }
    try {
      await vendorApi.approveApplication(selectedApplication.id, comment, selectedVenueId, user.id);
      const updatedApplication = await vendorApi.getApplications(user.id).catch(error => { refreshError(error, "applications"); return applications; });
      setApplications(updatedApplication);
      setPageMessage("Booking confirmed.");
      setTimeout(() => setPageMessage(""), 3000);
      onClose();
    } catch (error) {
      setErrorMessage(requestError(error, "Failed to approve application. Please try again."));
    }
  };

  //function to reject the application
  const reject = async () => {
    if (!selectedApplication?.id) return;
    try {
      await vendorApi.rejectApplication(selectedApplication.id, comment);
      if (!user) return
      const updatedApplication = await vendorApi.getApplications(user.id).catch(error => { refreshError(error, "applications"); return applications; });
      setApplications(updatedApplication);
      setPageMessage("Application rejected!");
      setTimeout(() => setPageMessage(""), 3000);
      onClose();
    } catch (error) {
      setErrorMessage(requestError(error, "Failed to reject application. Please try again."));
    }
  };

  //function to get the color of the status 
  const getStatusColor = (status: string) => {
    if (status === "approved") return "green";
    if (status === "rejected") return "red";
    return "yellow";
  };

  const handleCreateVenue = async() => {
    if (!user) return;
      if (!venueName.trim()) {
        alert("Venue name is required");
        return;
      }

      if (!location.trim()) {
        alert("Location is required");
        return;
      }

      if (capacity <= 0) {
        alert("Capacity must be greater than 0");
        return;
      }

      if (price <= 0) {
        alert("Price must be greater than 0");
        return;
      }

      if (!description.trim()) {
        alert("Description is required");
        return;
      }

      if (!image.trim()) {
        alert("Image URL is required");
        return;
      }
    try {
      await vendorApi.createVenue({name: venueName, location, capacity, price, description, image, suitabilities: suitabilityText.split(",").map(s => s.trim()).filter(Boolean)});
      const updated = await vendorApi.getMyVenues(user.id).catch(error => { refreshError(error, "venues"); return venues; });
      setVenues(updated);
      setVenueName("");
      setLocation("");
      setCapacity(0);
      setPrice(0);
      setDescription("");
      setImage("");
      setSuitabilityText("");
    } catch (error) {
      alert(requestError(error, "Could not create the venue."));
    }
  };

  const handleUpdateVenue = async () => {
    if (!user || !editingVenue) return;
      if (!venueName.trim()) {
        alert("Venue name is required");
        return;
      }

      if (!location.trim()) {
        alert("Location is required");
        return;
      }

      if (capacity <= 0) {
        alert("Capacity must be greater than 0");
        return;
      }

      if (price <= 0) {
        alert("Price must be greater than 0");
        return;
      }

      if (!description.trim()) {
        alert("Description is required");
        return;
      }

      if (!image.trim()) {
        alert("Image URL is required");
        return;
      }
    try {
      await vendorApi.updateVenue(editingVenue.id, {name: venueName, location, capacity, price, description, image, suitabilities: suitabilityText.split(",").map(s => s.trim()).filter(Boolean)});
      const updated = await vendorApi.getMyVenues(user.id).catch(error => { refreshError(error, "venues"); return venues; });
      setVenues(updated);
      setEditingVenue(null);
      setVenueName("");
      setLocation("");
      setCapacity(0);
      setPrice(0);
      setDescription("");
      setImage("");
      setSuitabilityText("");
    } catch (error) {
      alert(requestError(error, "Could not update the venue."));
    }
  };

  const handleDeleteVenue = async (venueId: number) => {
    try {
        const result = await vendorApi.deleteVenue(venueId, user!.id);
        alert(result.message);
        const updated = await vendorApi.getMyVenues(user!.id).catch(error => { refreshError(error, "venues"); return venues; });
        setVenues(updated);
    } catch (error) {
        alert(requestError(error, "Unable to delete venue."));
    }
  };

  const chartOptions = {
    backgroundColor: "rgba(59, 130, 246, 0.5)",
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1, // only whole numbers
        },
      },
    },
  };

  if (!user || user.role !== "vendor") return null;

  const uniqueHirers:number[] = Array.from(
    new Set(applications.map(app => app.hirerID))
  );
  return (
    <>
      <Head><title>Vendor Dashboard — Venue Vendors</title></Head>
      <Box maxW="6xl" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
        <Heading as="h1" size="xl" mb={1} color="gray.700">Vendor Dashboard</Heading>
        <Text color="gray.600" mb={6}>Welcome, {user.email}</Text>
        {pageMessage && (
          <Alert status="success" rounded="md" mb={4}>
            <AlertIcon />
            {pageMessage}
          </Alert>
        )}
        {Object.entries(loadErrors).map(([key, message]) => <Alert key={key} status="error" borderRadius="md" mb={3}><AlertIcon />{message}</Alert>)}
        <HStack mb={6} flexWrap="wrap" spacing={0} gap={3} aria-label="Vendor sections">
          <Button
            colorScheme={activeTab === "dashboard" ? "blue" : "gray"}
            variant={activeTab === "dashboard" ? "solid" : "outline"}
            onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </Button>
          <Button
            colorScheme={activeTab === "applicants" ? "blue" : "gray"}
            variant={activeTab === "applicants" ? "solid" : "outline"}
            onClick={() => setActiveTab("applicants")}>Applications
          </Button>
          <Button
            colorScheme={activeTab === "history" ? "blue" : "gray"}
            variant={activeTab === "history" ? "solid" : "outline"}
            onClick={() => setActiveTab("history")}>Hire History
          </Button>
          <Button
            colorScheme={activeTab === "venues" ? "blue" : "gray"}
            variant={activeTab === "venues" ? "solid" : "outline"}
            onClick={() => setActiveTab("venues")}>My Venues
          </Button>
          <Button
            colorScheme={activeTab === "blockedVenue" ? "blue" : "gray"}
            variant={activeTab === "blockedVenue" ? "solid" : "outline"}
            onClick={() => setActiveTab("blockedVenue")}>Block a Venue
          </Button>
        </HStack>

        {activeTab === "dashboard" && (
          <Box>
            <Select aria-label="Dashboard reporting period" value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month" | "lastMonth" | "all")}
              maxW="250px" mb={4}>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="all">All Time</option>
            </Select>
            <Heading size="md" mb={6} color="gray.700">Infographic</Heading>
            {applications.length === 0 ? (
              <Text color="gray.600">No application data available yet.</Text>
            ) : (
              <VStack spacing={6} align="stretch">
                <Box bg="white" p={6} rounded="xl" maxW="700px">
                  <Heading size="sm" mb={4}>Hirer Tallies per Venue</Heading>
                  {dashboardStats?.venueTallies && Object.entries(dashboardStats.venueTallies).map(([venueName, hirers]) => (
                    <Box key={venueName} mb={8}>
                      <Text mb={2} fontWeight="bold">{venueName}</Text>
                      <Bar data={{
                        labels: Object.keys(hirers),
                        datasets: [{
                          label: "Approved Bookings",
                          data: Object.values(hirers),
                        },],
                      }} options={chartOptions} />
                    </Box>
                  ))}
                </Box>
                <Box bg="white" p={6} rounded="xl" maxW="700px">
                  <Heading size="sm" mb={4}>All venue Combined</Heading>
                  {dashboardStats?.combinedTallies && (
                    <Bar data={{
                      labels: Object.keys(dashboardStats.combinedTallies),
                      datasets: [{
                        label: "Total approved Bookings",
                        data: Object.values(dashboardStats.combinedTallies),
                      },],
                    }} options={chartOptions}/>
                  )}
                </Box>
                <Box bg="white" p={6} rounded="xl" maxW="700px">
                  <Heading size="sm" mb={4}>Most vs Least Active Hirer</Heading>
                  {dashboardStats?.mostActive && dashboardStats?.leastActive && (
                    <Pie data = {{
                      labels: [`Most Active: ${dashboardStats.mostActive.name}`, `Least Active: ${dashboardStats.leastActive.name}`],
                      datasets: [
                        {
                          data: [
                            dashboardStats.mostActive.count, dashboardStats.leastActive.count,
                          ],
                          backgroundColor: [
                            "rgba(255, 99, 132, 0.5)",
                            "rgba(54, 162, 235, 0.5)",
                            "rgba(255, 206, 86, 0.5)",
                          ],
                        },
                      ],
                    }} options={chartOptions}/>
                  )}
                </Box>
                <Box bg="white" p={6} rounded="xl" maxW="700px">
                  <Heading size="sm" mb={4}>Venue Utilization Over Time</Heading>
                  {dashboardStats?.venueUtilization && Object.keys(dashboardStats.venueUtilization).length > 0
                    ? (() => {
                        const allDates = Array.from(
                          new Set(
                            Object.values(dashboardStats.venueUtilization)
                              .flatMap((dates) => Object.keys(dates))
                          )
                        ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                        const colors = [
                          "rgba(255, 99, 132, 1)",
                          "rgba(54, 162, 235, 1)",
                          "rgba(255, 206, 86, 1)",
                          "rgba(75, 192, 192, 1)",
                          "rgba(153, 102, 255, 1)",
                        ];

                        const datasets = Object.entries(dashboardStats.venueUtilization).map(
                          ([venueName, dates], i) => ({
                            label: venueName,
                            data: allDates.map(date => dates[date] || 0),
                            borderColor: colors[i % colors.length],
                            backgroundColor: colors[i % colors.length].replace("1)", "0.1)"),
                            tension: 0.3,
                            fill: false,
                          })
                        );

                        return (
                          <Line
                            data={{ labels: allDates, datasets }}
                            options={chartOptions}
                          />
                        );
                      })()
                    : <Text color="gray.600">No utilization data for this period.</Text>
                  }
                </Box>
              </VStack>
            )}
          </Box>
        )}

        {activeTab === "applicants" && (
          <Box>
            <HStack mb={4} justify="flex-end" flexWrap="wrap" spacing={0} gap={3}>
              <Text fontSize="sm" color="gray.600">Sort by:</Text>
              <Button size="sm" colorScheme={sortBy === "default" ? "blue" : "gray"} variant={sortBy === "default" ? "solid" : "outline"}
                onClick={() => setSortBy("default")}>Default</Button>
              <Button size="sm" colorScheme={sortBy === "reputation" ? "blue" : "gray"}variant={sortBy === "reputation" ? "solid" : "outline"} onClick={() => {setSortBy("reputation"); setDirectionSort("desc");}}>Reputation Score
              </Button>
              {sortBy === "reputation" && (
                <Button size="sm" variant="outline" colorScheme="blue" onClick={() => setDirectionSort(directionSort === "desc" ? "asc" : "desc")}>{directionSort === "desc" ? "Highest First" : "Lowest First"}
                </Button>
              )}
            </HStack>

            <VStack spacing={4} align="stretch">
              {applicationsLoading && <Text as="div" role="status"><Spinner size="sm" mr={2} />Loading applications…</Text>}
              {!applicationsLoading && !loadErrors.applications && sortApplication.length === 0 && (<Text color="gray.600">No applicants available.</Text>)}
              {sortApplication.map((app, index) => {
                const profile = getHirerProfile(app.hirerID);
                const email = app.hirerEmail;

                return (
                  <Box key={index} p={5} bg="white" rounded="xl" shadow="sm" border="1px solid" borderColor="gray.200"
                    cursor="pointer" _hover={{ borderColor: "blue.300", shadow: "md" }} onClick={() => handleSelectApplication(app)} transition="all 0.2s">
                    <HStack justify="space-between" mb={3} flexWrap="wrap" gap={3}>
                      <VStack align="start" spacing={0}>
                        <Heading size="sm" color="gray.700">{profile.name || app.hirerID}</Heading>
                        <Text fontSize="sm" color="gray.600">{email}</Text>
                      </VStack>
                      <HStack>
                        <Badge colorScheme={getStatusColor(app.status)} px={3} py={1} rounded="full"> {app.status.toUpperCase()}</Badge>
                        <StarRating rating={getReputation(app)} />
                      </HStack>
                    </HStack>

                    <Divider mb={3} />

                    <HStack spacing={0} gap={6} flexWrap="wrap" align="start">
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">EVENT</Text>
                        <Text fontSize="sm">{app.event?.eventName}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">VENUE PREFERENCES</Text>
                        {app.venues.map((venueId, index) => (
                          <Text fontSize="sm" key={venueId}>
                            {index + 1}. {getVenueName(venueId)} — {getVenueLocation(venueId)}
                            {isVenueBlocked((venueId), app.event?.date) && (
                              <Badge colorScheme="red" ml={2} fontSize="xs">BLOCKED</Badge>
                            )}
                          </Text>
                        ))}
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">GUESTS</Text>
                        <Text fontSize="sm">{app.event?.guests}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">DATE & TIME</Text>
                        <Text fontSize="sm">{app.event?.date} at {app.event?.time}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">DURATION</Text>
                        <Text fontSize="sm">{app.event?.duration} hours</Text>
                      </Box>
                    </HStack>
                    {app.comment && (
                      <Box mt={3} p={3} bg="blue.50" rounded="md">
                        <Text fontSize="xs" color="blue.600" fontWeight="bold">YOUR COMMENT</Text>
                        <Text fontSize="sm" color="blue.700">{app.comment}</Text>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {activeTab === "history" && (
          <VStack spacing={6} align="stretch">
            {uniqueHirers.map((hirerID) => {
              const history = getHireHistory(hirerID);
              const summary = getHistorySummary(hirerID);
              const profile = getHirerProfile(hirerID);
              const email = getHirerEmail(hirerID);

              return (
                <Box key={hirerID} bg="white" rounded="xl" shadow="sm" border="1px solid" borderColor="gray.200" overflow="hidden">
                  <Box px={4} py={3} bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
                    <Heading size="sm" color="gray.700">{profile.name || hirerID}</Heading>
                    <Text fontSize="xs" color="gray.600">{email}</Text>
                  </Box>

                  {history.length === 0 ? (
                    <Box p={4}>
                      <Text fontSize="sm" color="gray.600">No past hiring history available.</Text>
                    </Box>
                  ) : (
                    <TableContainer tabIndex={0} role="region" aria-label="Hire history, scroll horizontally">
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Venue Name</Th>
                            <Th>Location</Th>
                            <Th>Event Name</Th>
                            <Th>Event Date</Th>
                            <Th>Star Rating (out of 5)</Th>
                            <Th>Documents</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {history.map((hist) => (
                            <Tr key={hist.id}>
                              <Td>{hist.venue.venueName}</Td>
                              <Td>{hist.venue.location}</Td>
                              <Td>{hist.eventName}</Td>
                              <Td>{hist.eventDate}</Td>
                              <Td>{hist.rating} / 5</Td>
                              <Td>
                                <VStack align="start" spacing={1}>
                                  {REQUIRED_DOCUMENTS.map((doc) => {
                                    const isUploaded = hist.documents.includes(doc);
                                    if (doc === "Business Registration" && !isUploaded) {
                                      return (
                                        <Badge key={doc} colorScheme="gray" fontSize="xs">{doc} — N/A</Badge>
                                      );
                                    }
                                    return (
                                      <Badge key={doc} colorScheme={isUploaded ? "green" : "red"} fontSize="xs">{isUploaded ? ` ${doc}` : ` ${doc} — Missing`}</Badge>
                                    );
                                  })}
                                </VStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                        <Tfoot>
                          <Tr bg="blue.50">
                            <Td colSpan={2}><Text fontSize="xs" color="blue.700" fontWeight="bold">SUMMARY</Text></Td>
                            <Td><Text fontSize="xs" color="blue.700">Total Events: {summary.totalEvents}</Text></Td>
                            <Td><Text fontSize="xs" color="blue.700">Locations: {summary.uniqueLocations}</Text></Td>
                            <Td><Text fontSize="xs" color="blue.700">Avg Rating: {summary.avgRating} / 5</Text></Td>
                            <Td />
                          </Tr>
                        </Tfoot>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              );
            })}
          </VStack>
        )}

        {activeTab === "venues" && (
          <Box>
            <Heading size="md" mb={4}>{editingVenue ? "Edit Venue" : "Create Venue"}</Heading>
            <VStack spacing={4} align="stretch" mb={6} p={{ base: 4, md: 6 }} bg="white" borderWidth="1px" borderRadius="lg">
              <FormControl><FormLabel>Venue Name</FormLabel><Input value={venueName} onChange={(e) => setVenueName(e.target.value)}/></FormControl>
              <FormControl><FormLabel>Venue Location</FormLabel><Input value={location} onChange={(e) => setLocation(e.target.value)}/></FormControl>
              <FormControl><FormLabel>Capacity</FormLabel><Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel>Price</FormLabel><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel>Description</FormLabel><Textarea value={description} onChange={(e) => setDescription(e.target.value)}/></FormControl>
              <FormControl><FormLabel>Image URL</FormLabel><Input value={image} onChange={(e) => setImage(e.target.value)}/></FormControl>
              <FormControl><FormLabel>Suitability</FormLabel><Input value={suitabilityText} onChange={(e) => setSuitabilityText(e.target.value)}/></FormControl>
              <Button colorScheme="blue"
                onClick={
                  editingVenue
                    ? handleUpdateVenue
                    : handleCreateVenue
                }>{editingVenue ? "Update Venue" : "Create Venue"}
              </Button>
            </VStack>
            <VStack spacing={4} align="stretch">
              {venues.map((venue) => (
                <Box key={venue.id} p={4} bg="white" border="1px solid" borderColor="gray.200" rounded="md">
                  <Heading size="sm">Venue Name: {venue.name}</Heading>
                  <Text>Venue Location: {venue.location}</Text>
                  <Text>Capacity: {venue.capacity}</Text>
                  <Text>Price: ${venue.price}</Text>
                  <HStack mt={3} flexWrap="wrap" gap={2}>
                    <Button size="sm" onClick={() => {setEditingVenue(venue); setVenueName(venue.name);
                                                      setLocation(venue.location); setCapacity(venue.capacity);
                                                      setPrice(venue.price); setDescription(venue.description);
                                                      setImage(venue.image); setSuitabilityText(venue.venueSuitabilities?.map(v => v.keyword).join(", ") || ""); window.scrollTo({top:0, behavior:"smooth"})}}>Edit Venue</Button>
                    <Button size="sm" colorScheme="red" onClick={() => handleDeleteVenue(venue.id)}>Delete Venue</Button>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {activeTab === "blockedVenue" && (
          <Box>
            {blockMessage && (
              <Alert status={blockError ? "error" : "success"} rounded="md" mb={4}>
                <AlertIcon />{blockMessage}
              </Alert>
            )}

            <Box p={6} bg="white" rounded="xl" shadow="sm" border="1px solid" borderColor="gray.200" mb={6}>
              <Heading size="sm" mb={4} color="gray.700">Block Venue</Heading>
              <VStack spacing={4} align="stretch">
                <FormControl isInvalid={!!blockErrors.venueName}>
                  <FormLabel fontSize="sm" color="gray.600">Venue</FormLabel>
                  <Select placeholder="Select a venue to block" value={blockVenueName} onChange={(e) => setBlockVenueName(e.target.value)}
                    focusBorderColor="blue.400">
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.name}>{venue.name} — {venue.location}</option>
                    ))}
                  </Select>
                  <FormErrorMessage>{blockErrors.venueName}</FormErrorMessage>
                </FormControl>
                <HStack spacing={4} align="start" flexDirection={{ base: "column", md: "row" }} w="full">
                  <FormControl isInvalid={!!blockErrors.startDate}>
                    <FormLabel fontSize="sm" color="gray.600">Start Date</FormLabel>
                    <Input type="date" value={blockStartDate} onChange={(e) => setBlockStartDate(e.target.value)} focusBorderColor="blue.400"/>
                    <FormErrorMessage>{blockErrors.startDate}</FormErrorMessage>
                  </FormControl>
                  <FormControl isInvalid={!!blockErrors.endDate}>
                    <FormLabel fontSize="sm" color="gray.600">End Date</FormLabel>
                    <Input type="date" value={blockEndDate} onChange={(e) => setBlockEndDate(e.target.value)} focusBorderColor="blue.400"/>
                    <FormErrorMessage>{blockErrors.endDate}</FormErrorMessage>
                  </FormControl>
                </HStack>
                <FormControl isInvalid={!!blockErrors.reason}>
                  <FormLabel fontSize="sm" color="gray.600">Reason</FormLabel>
                  <Select placeholder="Select a reason" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                    focusBorderColor="blue.400">
                    <option value="Maintenance">Maintenance</option>
                    <option value="Renovation">Renovation</option>
                  </Select>
                  <FormErrorMessage>{blockErrors.reason}</FormErrorMessage>
                </FormControl>

                <Button colorScheme="red" onClick={handleBlockedVenue} alignSelf="flex-start">Block Venue</Button>
              </VStack>
            </Box>
            <Heading size="sm" mb={3} color="gray.700">Currently Blocked Periods</Heading>

            {blockedPeriods.length === 0 ? (
              <Text color="gray.600" fontSize="sm">No venues are currently blocked.</Text>) : (
              <VStack spacing={3} align="stretch">
                {blockedPeriods.map((block, index) => (
                  <Box key={index} p={4} bg="red.50" rounded="xl" border="1px solid" borderColor="red.200">
                    <HStack justify="space-between" flexWrap="wrap" gap={3}>
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Badge colorScheme="red">BLOCKED</Badge>
                          <Text fontWeight="bold" fontSize="sm">{block.venueName}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">{block.startDate} - {block.endDate}</Text>
                        <Text fontSize="xs" color="red.600">Reason: {block.reason}</Text>
                      </VStack>
                      <Button size="sm" colorScheme="red" variant="outline" onClick={() => handleRemoveBlock(block.id)}>Remove Block</Button>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        )}
      </Box>
      <VendorApplicationModal isOpen={isOpen} onClose={onClose} selectedApplication={selectedApplication}
        comment={comment} setComment={setComment} editComment={editComment} showActions={showActions}
        modalMessage={modalMessage} errorMessage={errorMessage} selectedVenueId={selectedVenueId} setSelectedVenueId={setSelectedVenueId}
        handleEditComment={handleEditComment} handleCancelEdit={handleCancelEdit} handleActOnApplication={handleActOnApplication}
        saveComment={saveComment} approve={approve} reject={reject} getStatusColor={getStatusColor}
        getHirerProfile={getHirerProfile} getVenueName={getVenueName} getVenueLocation={getVenueLocation}
        getReputation={getReputation} isVenueBlocked={isVenueBlocked} getBlockReason={getBlockReason}
        getHireHistory={getHireHistory} getHistorySummary={getHistorySummary}/>
    </>
  );
}

