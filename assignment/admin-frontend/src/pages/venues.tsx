import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Box, Flex, Button, Heading, Text, VStack, Table, Thead, Tbody, Tr, Th, Td, Spinner, HStack, Input, Select, Textarea, useToast, Checkbox, FormControl, FormLabel, FormErrorMessage, SimpleGrid, TableContainer, Alert, AlertIcon } from "@chakra-ui/react";
import { requestError } from "@/utils/requestError";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

type VenueSuitability = {
  id: string;
  keyword: string;
};

type Vendor = {
  id: string;
  email: string;
};

//added image, could also change in the future to use a feature to upload an image from device
type Venue = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  price: number;
  vendor: Vendor | null;
  venueSuitabilities: VenueSuitability[];
  description: string,
  image: string,
  isFeatured: boolean,
};

type VenuesData = {
  venues: Venue[];
  vendors: Vendor[];
};

const emptyForm = {
  id: "",
  name: "",
  location: "",
  capacity: "",
  price: "",
  description: "",
  image: "",
  vendorId: "",
  suitability1: "",
  suitability2: "",
  suitability3: "",
  suitability4: "",
  isFeatured: false,
};

const GET_VENUES = gql`
  query GetVenues($venueOffset: Int!, $vendorOffset: Int!) {
    venues(limit: 100, offset: $venueOffset) {
      id
      name
      location
      capacity
      price
      description
      image
      isFeatured
      vendor {
        id
        email
      }
      venueSuitabilities {
        id
        keyword
      }
    }
    vendors(limit: 100, offset: $vendorOffset) {
      id
      email
    }
  }
`;
const CREATE_VENUE = gql`
  mutation CreateVenue(
    $name: String!
    $location: String!
    $capacity: Int!
    $price: Float!
    $description: String!
    $image: String!
    $vendorId: ID!
    $suitabilities: [String!]
    $isFeatured: Boolean
  ) {
    createVenue(
      name: $name
      location: $location
      capacity: $capacity
      price: $price
      description: $description
      image: $image
      vendorId: $vendorId
      suitabilities: $suitabilities
      isFeatured: $isFeatured
    ) {
      id
    }
  }
`;

const UPDATE_VENUE = gql`
  mutation UpdateVenue(
    $id: ID!
    $name: String!
    $location: String!
    $capacity: Int!
    $price: Float!
    $description: String!
    $image: String!
    $vendorId: ID!
    $suitabilities: [String!]
    $isFeatured: Boolean
  ) {
    updateVenue(
      id: $id
      name: $name
      location: $location
      capacity: $capacity
      price: $price
      description: $description
      image: $image
      vendorId: $vendorId
      suitabilities: $suitabilities
      isFeatured: $isFeatured
    ) {
      id
    }
  }
`;

const DELETE_VENUE = gql`
  mutation DeleteVenue($id: ID!) {
    deleteVenue(id: $id)
  }
`;

//removed set  message for toast
export default function Venues() {
  const router = useRouter();
  const { isAdmin, isCheckingAuth } = useRequireAdmin();
  const [venueOffset, setVenueOffset] = useState(0);
  const [vendorOffset, setVendorOffset] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editorOpen) editorHeading.current?.focus(); }, [editorOpen]);
  useEffect(() => { if (Object.keys(formErrors).length) errorSummary.current?.focus(); }, [formErrors]);
  const { data, loading, error, refetch } = useQuery<VenuesData>(GET_VENUES, {
    skip: !isAdmin,
    variables: { venueOffset, vendorOffset },
  });

  const [createVenue, { loading: creating }] = useMutation(CREATE_VENUE);
  const [updateVenue, { loading: updating }] = useMutation(UPDATE_VENUE);
  const [deleteVenue] = useMutation(DELETE_VENUE);
  const toast = useToast();

  const handleChange = (field: string, value: string) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setEditorOpen(false);
    setFormErrors({});
  };

  const editVenue = (venue: Venue) => {
    const suitabilities = venue.venueSuitabilities.map(
      (suitability) => suitability.keyword
    );
    setForm({
      id: venue.id,
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity.toString(),
      price: venue.price.toString(),
      description: venue.description,
      image: venue.image,
      vendorId: venue.vendor?.id || "",
      suitability1: suitabilities[0] || "",
      suitability2: suitabilities[1] || "",
      suitability3: suitabilities[2] || "",
      suitability4: suitabilities[3] || "",
      isFeatured: venue.isFeatured,
    });

    setIsEditing(true);
    setEditorOpen(true);
    setFormErrors({});
  };

  const saveVenue = async () => {
    const required = { name: "Venue name", location: "Location", capacity: "Capacity", price: "Price", description: "Description", image: "Image URL", vendorId: "Vendor" };
    const missing = Object.fromEntries(Object.entries(required).filter(([field]) => !form[field as keyof typeof form]).map(([field, label]) => [field, `${label} is required.`]));
    setFormErrors(missing);
    if (Object.keys(missing).length) return;
    const suitabilities = [
      form.suitability1,
      form.suitability2,
      form.suitability3,
      form.suitability4,
    ].filter((keyword) => keyword.trim().length > 0);

    const variables = {
      name: form.name,
      location: form.location,
      capacity: Number(form.capacity),
      price: Number(form.price),
      description: form.description,
      image: form.image,
      vendorId: form.vendorId,
      suitabilities,
      isFeatured: form.isFeatured,
    };

    try {
      if (isEditing) {
        await updateVenue({
          variables: {
            id: form.id,
            ...variables,
          },
        });

        toast({
          title: "Venue updated.",
          description: "The venue was updated successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        await createVenue({
          variables,
        });

        toast({
          title: "Venue created.",
          description: "The venue was added successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      clearForm();
      await refetch().catch(error => toast({ title: "Venue saved. List could not refresh.", description: requestError(error, "Please reload the page."), status: "warning", isClosable: true }));
    } catch (error) {
      toast({
        title: "Save failed.",
        description:
          requestError(error, "The venue couldn't be saved."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }

  };

  const removeVenue = async (id: string) => {
    const shouldDelete = confirm("Are you sure you want to delete this venue?");
    if (!shouldDelete) {
      return;
    }
    try {
      await deleteVenue({
        variables: {
          id,
        },
      });

      toast({
        title: "Venue deleted.",
        description: "Venue deleted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await refetch().catch(error => toast({ title: "Venue deleted. List could not refresh.", description: requestError(error, "Please reload the page."), status: "warning", isClosable: true }));
    } catch (error) {
      toast({
        title: "Delete failed.",
        description: requestError(error, "Venue couldn't be deleted."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (isCheckingAuth || !isAdmin) {
    return <Spinner display="block" mx="auto" mt={12} />;
  }

  return (
    <Box maxW="1200px" mx="auto" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={5}>
        <Flex justify="space-between" align="center" gap={5} flexWrap="wrap">
          <Box><Heading as="h1">Manage venues</Heading>
            <Text mt={2} color="gray.600">Keep listings current, assign vendors and choose featured spaces.</Text>
          </Box>
          <Button onClick={() => { clearForm(); setEditorOpen(true); }}>Add venue</Button>
        </Flex>
        <Box hidden={!editorOpen} borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }} bg="white" minW={0}>
          <Heading ref={editorHeading} tabIndex={-1} size="md" mb={3}>
            {isEditing ? "Edit Venue" : "Add Venue"}
          </Heading>

          {Object.keys(formErrors).length > 0 && <Box ref={errorSummary} tabIndex={-1} role="alert" mb={4} p={4} bg="red.50" borderRadius="md"><Text fontWeight="bold">Please complete the required fields</Text>{Object.values(formErrors).map(message => <Text key={message}>{message}</Text>)}</Box>}
          <VStack align="stretch" spacing={3}>
            <FormControl isRequired isInvalid={!!formErrors.name}><FormLabel>Venue name</FormLabel><Input
              placeholder="Venue name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            /><FormErrorMessage>{formErrors.name}</FormErrorMessage></FormControl>

            <FormControl isRequired isInvalid={!!formErrors.location}><FormLabel>Location</FormLabel><Input
              placeholder="Location"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
            /><FormErrorMessage>{formErrors.location}</FormErrorMessage></FormControl>

            <HStack align="start">
              <FormControl isRequired isInvalid={!!formErrors.capacity}><FormLabel>Capacity</FormLabel><Input
                placeholder="Capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
              /><FormErrorMessage>{formErrors.capacity}</FormErrorMessage></FormControl>

              <FormControl isRequired isInvalid={!!formErrors.price}><FormLabel>Price ($)</FormLabel><Input
                placeholder="Price"
                type="number"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
              /><FormErrorMessage>{formErrors.price}</FormErrorMessage></FormControl>
            </HStack>

            <FormControl isRequired isInvalid={!!formErrors.description}><FormLabel>Description</FormLabel><Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            /><FormErrorMessage>{formErrors.description}</FormErrorMessage></FormControl>

            <FormControl isRequired isInvalid={!!formErrors.image}><FormLabel>Image URL</FormLabel><Input
              placeholder="Image URL"
              value={form.image}
              onChange={(e) => handleChange("image", e.target.value)}
            /><FormErrorMessage>{formErrors.image}</FormErrorMessage></FormControl>

            <FormControl isRequired isInvalid={!!formErrors.vendorId}><FormLabel>Vendor</FormLabel><Select
              placeholder="Assign vendor"
              value={form.vendorId}
              onChange={(e) => handleChange("vendorId", e.target.value)}
            >
              {form.vendorId && !data?.vendors.some(vendor => vendor.id === form.vendorId) && <option value={form.vendorId}>Selected vendor</option>}
              {data?.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.email}
                </option>
              ))}
            </Select><FormErrorMessage>{formErrors.vendorId}</FormErrorMessage></FormControl>
            <HStack flexWrap="wrap" gap={2} spacing={0}>
              <Button size="sm" isDisabled={vendorOffset === 0 || loading} onClick={() => setVendorOffset(value => Math.max(0, value - 100))}>Previous vendors</Button>
              <Button size="sm" isDisabled={loading || (data?.vendors.length ?? 0) < 100} onClick={() => setVendorOffset(value => value + 100)}>Next vendors</Button>
            </HStack>
            <Checkbox
              isChecked={form.isFeatured}
              onChange={(e) =>
                setForm({
                  ...form,
                  isFeatured: e.target.checked,
                })
              }
            >
              Featured Venue
            </Checkbox>

            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              <FormControl><FormLabel>Suitability 1</FormLabel><Input
                placeholder="Suitability 1"
                value={form.suitability1}
                onChange={(event) => handleChange("suitability1", event.target.value)}
              /></FormControl>

              <FormControl><FormLabel>Suitability 2</FormLabel><Input
                placeholder="Suitability 2"
                value={form.suitability2}
                onChange={(event) => handleChange("suitability2", event.target.value)}
              /></FormControl>

              <FormControl><FormLabel>Suitability 3</FormLabel><Input
                placeholder="Suitability 3"
                value={form.suitability3}
                onChange={(event) => handleChange("suitability3", event.target.value)}
              /></FormControl>

              <FormControl><FormLabel>Suitability 4</FormLabel><Input
                placeholder="Suitability 4"
                value={form.suitability4}
                onChange={(event) => handleChange("suitability4", event.target.value)}
              /></FormControl>
            </SimpleGrid>

            <HStack flexWrap="wrap" gap={2} spacing={0}>
              <Button onClick={saveVenue} isLoading={creating || updating} loadingText="Saving">
                {isEditing ? "Update Venue" : "Create Venue"}
              </Button>

              <Button variant="outline" onClick={clearForm}>Cancel</Button>
            </HStack>
          </VStack>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }} bg="white" minW={0}>
          <Heading size="md" mb={3}>
            Venue Management
          </Heading>

          <HStack mb={3} flexWrap="wrap" gap={3} spacing={0}>
            <Button isDisabled={venueOffset === 0 || loading} onClick={() => setVenueOffset(value => Math.max(0, value - 100))}>Previous venues</Button>
            <Text>Page {venueOffset / 100 + 1}</Text>
            <Button isDisabled={loading || (data?.venues.length ?? 0) < 100} onClick={() => setVenueOffset(value => value + 100)}>Next venues</Button>
          </HStack>
          {loading && <Text as="div" role="status"><Spinner size="sm" mr={2} />Loading venues…</Text>}

          {error && (
            <Alert status="error" borderRadius="md"><AlertIcon />{requestError(error, "Could not load venues. Please try again.")}</Alert>
          )}

          {data && (
            <><Text display={{ base: "block", md: "none" }} fontSize="sm" color="gray.600" mb={2}>Scroll horizontally to view all columns.</Text><TableContainer tabIndex={0} role="region" aria-label="Venue management, scroll horizontally"><Table variant="simple" size="sm" minW="960px">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th>Capacity</Th>
                  <Th>Price</Th>
                  <Th>Vendor</Th>
                  <Th>Suitability</Th>
                  <Th>Featured</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>

              <Tbody>
                {data.venues.length === 0 && <Tr><Td colSpan={8} color="gray.600">No venues on this page.</Td></Tr>}
                {data.venues.map((venue) => (
                  <Tr key={venue.id}>
                    <Td>{venue.name}</Td>
                    <Td>{venue.location}</Td>
                    <Td>{venue.capacity}</Td>
                    <Td>${venue.price}</Td>
                    <Td>{venue.vendor?.email || "Unassigned"}</Td>
                    <Td>
                      {venue.venueSuitabilities.length > 0
                        ? venue.venueSuitabilities
                          .map((suitability) => suitability.keyword)
                          .join(", ")
                        : "None"}
                    </Td>
                    <Td>{venue.isFeatured ? "Yes" : "No"}</Td>
                    <Td>
                      <HStack flexWrap="wrap" gap={2} spacing={0}>
                        <Button size="sm" onClick={() => editVenue(venue)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => removeVenue(venue.id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table></TableContainer></>
          )}
        </Box>

        <Button alignSelf="flex-start" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </VStack>
    </Box>
  );
}
