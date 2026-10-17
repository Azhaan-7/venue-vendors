import { Profile } from "@/types/profiles";
import {Box, Heading, VStack, Text, Button, HStack, Badge, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,Textarea} from "@chakra-ui/react";
import { EventApplication } from "@/types/EventApplication";
import { StarRating } from "./StarRating";
import { HireHistory } from "@/types/hireHistory";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;

  selectedApplication: EventApplication | null;

  comment: string;
  setComment: (value: string) => void;

  editComment: boolean;
  showActions: boolean;

  modalMessage: string;
  errorMessage: string;

  selectedVenueId: number | null;
  setSelectedVenueId: (id: number) => void;

  handleEditComment: () => void;
  handleCancelEdit: () => void;
  saveComment: () => void;
  handleActOnApplication: () => void;

  approve: () => void;
  reject: () => void;

  getStatusColor: (status: string) => string;
  getHirerProfile: (id: number) => Profile;
  getVenueName: (id: number) => string;
  getVenueLocation: (id: number) => string;
  getReputation: (app: EventApplication) => number | null;
  isVenueBlocked: (venueId: number, eventDate: string) => boolean;
  getBlockReason: (venueId: number, eventDate: string) => string;
  getHireHistory: (hirerId: number) => HireHistory[];
  getHistorySummary: (hirerId: number) => {
    totalEvents: number;
    uniqueLocations: number;
    avgRating: string;
  };
}

export default function VendorApplicationModal({
  isOpen,
  onClose,
  selectedApplication,
  comment,
  setComment,
  editComment,
  showActions,
  modalMessage,
  errorMessage,
  selectedVenueId,
  setSelectedVenueId,
  handleEditComment,
  handleCancelEdit,
  handleActOnApplication,
  saveComment,
  approve,
  reject,
  getStatusColor,
  getHirerProfile,
  getVenueName,
  getVenueLocation,
  getReputation,
  isVenueBlocked,
  getBlockReason,
  getHireHistory,
  getHistorySummary,
}: ApplicationModalProps) {
  if (!selectedApplication) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
            <ModalHeader>
                <HStack flexWrap="wrap" gap={2}>
                  <Text>
                    {selectedApplication? getHirerProfile(selectedApplication.hirerID).name || selectedApplication.hirerID: ""} - Application Details
                  </Text>
                  <Badge colorScheme={getStatusColor(selectedApplication?.status || "pending")}>{selectedApplication?.status.toUpperCase()}</Badge>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
    
              <ModalBody>
                {selectedApplication && (
                  <VStack spacing={4} align="stretch">
                    {modalMessage && (
                      <Alert status="success" rounded="md">
                        <AlertIcon />{modalMessage}
                      </Alert>
                    )}
                    {errorMessage && (
                      <Alert status="error" rounded="md">
                        <AlertIcon />{errorMessage}
                      </Alert>
                    )}
    
                    <Box p={4} bg="gray.50" rounded="md">
                      <Heading size="sm" mb={3} color="gray.600">HIRER DETAILS</Heading>
                      <HStack spacing={0} gap={6} flexWrap="wrap" align="start">
                        <Box>
                          <Text fontSize="xs" color="gray.600">NAME</Text>
                          <Text fontSize="sm">{getHirerProfile(selectedApplication.hirerID).name || "Not set"}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">EMAIL</Text>
                          <Text fontSize="sm">{selectedApplication.hirerEmail}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">PHONE</Text>
                          <Text fontSize="sm">{getHirerProfile(selectedApplication.hirerID).phoneNumber || "Not set"}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">REPUTATION</Text>
                          <StarRating rating={getReputation(selectedApplication)} />
                        </Box>
                      </HStack>
                    </Box>
    
                    <Box p={4} bg="gray.50" rounded="md">
                      <Heading size="sm" mb={3} color="gray.600">EVENT DETAILS</Heading>
                      <HStack spacing={0} gap={6} flexWrap="wrap" align="start">
                        <Box>
                          <Text fontSize="xs" color="gray.600">EVENT NAME</Text>
                          <Text fontSize="sm">{selectedApplication.event?.eventName}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">VENUE PREFERENCES</Text>
                          {selectedApplication.venues.map((venueId, index) => (
                            <Text fontSize="sm" key={venueId}>{index + 1}. {getVenueName(venueId)} — {getVenueLocation(venueId)}</Text>
                          ))}
                        </Box>
                          {selectedApplication.status === "approved" && selectedApplication.approvedVenueID && (
                            <Box mt={2} p={2}>
                              <Text fontSize="xs" color="gray.600" fontWeight="bold">CONFIRMED VENUE</Text>
                              <Text fontSize="sm" fontWeight="bold">
                                {getVenueName(selectedApplication.approvedVenueID)} — {getVenueLocation(selectedApplication.approvedVenueID)}
                              </Text>
                            </Box>
                          )}
                          {selectedApplication.venues.map((venueId, index) => {
                            const isBlocked = isVenueBlocked((venueId), selectedApplication.event?.date);
                            return (
                              <Box key={venueId} p={3}
                                rounded="md" border="1px solid"
                                cursor={isBlocked ? "not-allowed" : "pointer"}
                                opacity={isBlocked ? 0.6 : 1}
                                onClick={() => {
                                  if (!isBlocked) setSelectedVenueId(venueId);
                                }}>
                                <HStack flexWrap="wrap" gap={2}>
                                  <Badge colorScheme="blue">{index + 1}</Badge>
                                  <Text fontSize="sm" fontWeight="bold">{getVenueName(venueId)}</Text>
                                  <Text fontSize="sm" color="gray.600">— {getVenueLocation(venueId)}</Text>
                                  {isBlocked ? (
                                    <Badge colorScheme="red">BLOCKED — Cannot Select</Badge>) : selectedVenueId === venueId ? (
                                    <Badge colorScheme="blue">SELECTED</Badge>) : null
                                  }
                                </HStack>
                              </Box>
                            );
                          })}
                        <Box>
                          <Text fontSize="xs" color="gray.600">GUESTS</Text>
                          <Text fontSize="sm">{selectedApplication.event?.guests}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">DATE</Text>
                          <Text fontSize="sm">{selectedApplication.event?.date}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">TIME</Text>
                          <Text fontSize="sm">{selectedApplication.event?.time}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.600">DURATION</Text>
                          <Text fontSize="sm">{selectedApplication.event?.duration} hours</Text>
                        </Box>
                      </HStack>
    
                      {isVenueBlocked(
                        selectedApplication.venues[0], selectedApplication.event?.date) && (
                        <Alert status="warning" rounded="md" mt={3}>
                          <AlertIcon />
                          {getVenueName(selectedApplication.venues?.[0])} is blocked for this date —{" "}
                          {getBlockReason(
                            selectedApplication.venues?.[0], selectedApplication.event?.date
                          )}. Approving will automatically reject this application.
                        </Alert>
                      )}
                    </Box>
    
                    <Box p={4} bg="gray.50" rounded="md">
                      <Heading size="sm" mb={3} color="gray.600">HIRE HISTORY</Heading>
                      {getHireHistory(selectedApplication.hirerID).length === 0 ? (
                        <Text fontSize="sm" color="gray.600">No past hiring history available.</Text>
                      ) : (
                        <>
                          <VStack spacing={2} align="stretch">
                            {getHireHistory(selectedApplication.hirerID).map((hist) => (
                              <Box key={hist.id} p={3} bg="white" rounded="md" border="1px solid" borderColor="gray.200">
                                <HStack justify="space-between">
                                  <Box>
                                    <Text fontSize="sm" fontWeight="bold">{hist.eventName}</Text>
                                    <Text fontSize="xs" color="gray.600">{hist.venue.venueName} — {hist.venue.location} — {hist.eventDate}</Text>
                                  </Box>
                                  <Text>{hist.rating} / 5 *</Text>
                                </HStack>
                              </Box>
                            ))}
                          </VStack>
    
                          {(() => {
                            const summary = getHistorySummary(selectedApplication.hirerID);
                            return (
                              <Box mt={2} p={3} bg="blue.50" rounded="md" border="1px solid" borderColor="blue.200">
                                <HStack spacing={6}>
                                  <Box>
                                    <Text fontSize="xs" fontWeight="bold">TOTAL EVENTS</Text>
                                    <Text fontSize="sm">{summary.totalEvents}</Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="xs" fontWeight="bold">LOCATIONS VISITED</Text>
                                    <Text fontSize="sm">{summary.uniqueLocations}</Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="xs" fontWeight="bold">AVERAGE RATING</Text>
                                    <Text fontSize="sm">{summary.avgRating} / 5</Text>
                                  </Box>
                                </HStack>
                              </Box>
                            );
                          })()}
                        </>
                      )}
                    </Box>
                    <Box p={4} bg="gray.50" rounded="md">
                      <Heading size="sm" mb={3} color="gray.600">COMPLIANT DOCUMENTS</Heading>
                      <VStack spacing={3} align="stretch">
                        {(() => {
                          const hirerProfile = getHirerProfile(selectedApplication.hirerID);
                          return (
                            <>
                            <Box p={3}
                                bg={hirerProfile.driverLicense ? "green.50" : "red.50"}
                                rounded="md" border="1px solid"
                                borderColor={hirerProfile.driverLicense ? "green.200" : "red.200"}>
                                <HStack justify="space-between" mb={2}>
                                  <HStack flexWrap="wrap" gap={2}>
                                    <Badge colorScheme={hirerProfile.driverLicense ? "green" : "red"}>
                                      {hirerProfile.driverLicense ? "Uploaded" : "Missing"}
                                    </Badge>
                                    <Text fontSize="sm" fontWeight="bold">Driver&apos;s License</Text>
                                  </HStack>
                                  {hirerProfile.driverLicense && (
                                    <Text fontSize="xs" color="gray.600">{hirerProfile.driverLicense.name}</Text>
                                  )}
                                </HStack>
                                {hirerProfile.driverLicense && (
                                  <Box mt={2}>
                                    <Button as="a" href={hirerProfile.driverLicense.data} size="sm">Download JPG</Button>
                                  </Box>
                                )}
                              </Box>
                              <Box p={3} bg={hirerProfile.publicLiabilityInsurance ? "green.50" : "red.50"}
                                rounded="md" border="1px solid"
                                borderColor={hirerProfile.publicLiabilityInsurance ? "green.200" : "red.200"}>
                                <HStack justify="space-between" mb={2}>
                                  <HStack flexWrap="wrap" gap={2}>
                                    <Badge colorScheme={hirerProfile.publicLiabilityInsurance ? "green" : "red"}>{hirerProfile.publicLiabilityInsurance ? "Uploaded" : "Missing"}</Badge>
                                    <Text fontSize="sm" fontWeight="bold">Public Liability Insurance</Text>
                                  </HStack>
                                  {hirerProfile.publicLiabilityInsurance && (
                                    <Text fontSize="xs" color="gray.600">{hirerProfile.publicLiabilityInsurance.name}</Text>
                                  )}
                                </HStack>
                                {hirerProfile.publicLiabilityInsurance && (
                                  <Box mt={2}>
                                    <Button size="sm" colorScheme="blue"
                                      as="a" href={hirerProfile.publicLiabilityInsurance.data}>Download PDF</Button>
                                  </Box>
                                )}
                              </Box>
                              {hirerProfile.isBusiness ? (
                                <Box p={3}
                                  bg={hirerProfile.businessRegistration ? "green.50" : "red.50"}
                                  rounded="md" border="1px solid"
                                  borderColor={hirerProfile.businessRegistration ? "green.200" : "red.200"}>
                                  <HStack justify="space-between" mb={2}>
                                    <HStack flexWrap="wrap" gap={2}>
                                      <Badge colorScheme={hirerProfile.businessRegistration ? "green" : "red"}>
                                        {hirerProfile.businessRegistration ? "Uploaded" : "Missing"}
                                      </Badge>
                                      <Text fontSize="sm" fontWeight="bold">Business Registration</Text>
                                    </HStack>
                                    {hirerProfile.businessRegistration && (
                                      <Text fontSize="xs" color="gray.600">{hirerProfile.businessRegistration.name}</Text>
                                    )}
                                  </HStack>
                                  {hirerProfile.abn && (
                                    <Text fontSize="xs" color="gray.600" mb={2}>ABN: {hirerProfile.abn}</Text>
                                  )}
                                  {hirerProfile.businessRegistration && (
                                    <Box mt={2}>
                                      <Button size="sm" colorScheme="blue"
                                        as="a" href={hirerProfile.businessRegistration.data}>Download PDF</Button>
                                    </Box>
                                  )}
                                </Box>
                              ) : (
                                <Box p={3} bg="gray.100" rounded="md">
                                  <HStack flexWrap="wrap" gap={2}>
                                    <Badge colorScheme="gray">N/A</Badge>
                                    <Text fontSize="sm" color="gray.600">Business Registration — Not applicable (individual hirer)</Text>
                                  </HStack>
                                </Box>
                              )}
                              <Box p={3} rounded="md" bg="gray.100">
                                <HStack justify="space-between">
                                  <Text fontSize="sm" fontWeight="bold">Credibility Score</Text>
                                  <Text fontSize="sm" px={3} py={1}>{hirerProfile.credibilityScore ?? 0} / 5</Text>
                                </HStack>
                              </Box>
                            </>
                          );
                        })()}
                      </VStack>
                    </Box>
                    {selectedApplication.comment && !editComment && (
                      <Box p={4} bg="blue.50" rounded="md" border="1px solid" borderColor="blue.200">
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="xs" color="blue.600" fontWeight="bold">SAVED COMMENT</Text>
                          {selectedApplication.status !== "pending" && (
                            <Button size="xs" colorScheme="blue" variant="outline" onClick={handleEditComment}>Edit Comment</Button>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="blue.700">{selectedApplication.comment}</Text>
                      </Box>
                    )}
                    {editComment && (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={1} color="gray.600">Edit Comment</Text>
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
                          aria-label="Edit comment" placeholder="Edit your comment..." focusBorderColor="blue.400" rows={3}/>
                        <HStack mt={2}>
                          <Button size="sm" colorScheme="blue" onClick={saveComment}>Update Comment</Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                        </HStack>
                      </Box>
                    )}
                    {showActions && !selectedApplication.comment && !editComment && (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={1} color="gray.600">Add Comment</Text>
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
                          aria-label="Application comment" placeholder="Write your comment about this applicant..." focusBorderColor="blue.400" rows={3}/>
                        <Button mt={2} size="sm" colorScheme="blue" variant="outline" onClick={saveComment}>Save Comment</Button>
                      </Box>
                    )}
                    <Box p={4} bg="gray.50" rounded="md">
                      <Heading size="sm" mb={3} color="gray.700">Select which venue should be approved</Heading>
                      <Text fontSize="sm" color="gray.600" mb={2}>Preference of the Hirer:</Text>
                      <VStack align="stretch" spacing={2}>
                        {selectedApplication.venues.map((venueId, index) => (
                          <Box key={venueId} p={3} bg={selectedVenueId === venueId ? "blue.50" : "white"} rounded="md" border="1px solid" borderColor={selectedVenueId === venueId ? "blue.200" : "gray.300"} cursor="pointer" onClick={() => setSelectedVenueId(venueId)}>
                            <HStack flexWrap="wrap" gap={2}>
                              <Badge colorScheme="blue">{index+1}</Badge>
                              <Text fontSize="sm" fontWeight="bold">{getVenueName(venueId)}</Text>
                              <Text fontSize="sm" color="gray.600">-{getVenueLocation(venueId)}</Text>
                              {isVenueBlocked(venueId, selectedApplication.event?.date) && (
                                <Badge colorScheme="red">VENUE BLOCKED</Badge>
                              )}
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                      {!selectedVenueId && (
                        <Text fontSize="sm" color="red.600" mt={2}>Please select a venue to approve.</Text>
                      )}
                    </Box>
                  </VStack>
                )}
            </ModalBody>
            <ModalFooter>
                <HStack spacing={0} gap={3} flexWrap="wrap" justify="flex-end">
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                  {selectedApplication?.status === "pending" && !showActions && (
                    <Button colorScheme="blue" onClick={handleActOnApplication}>Act on this Application</Button>)}
                  {showActions && selectedApplication?.status === "pending" && (
                    <>
                      <Button colorScheme="red" variant="outline" onClick={reject}>Reject</Button>
                      <Button colorScheme="green" onClick={approve}>Approve & Confirm Booking</Button>
                    </>)}
                </HStack>
            </ModalFooter>
        </ModalContent>
    </Modal>
  );
}