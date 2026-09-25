import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Box, Button, Heading, Text, VStack, Table, Thead, Tbody, Tr, Th, Td, Spinner, HStack, Input, Select, Textarea, useToast, Checkbox } from "@chakra-ui/react";

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
  query GetVenues {
    venues {
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
    vendors {
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
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const { data, loading, error, refetch } = useQuery<VenuesData>(GET_VENUES);

  const [createVenue] = useMutation(CREATE_VENUE);
  const [updateVenue] = useMutation(UPDATE_VENUE);
  const [deleteVenue] = useMutation(DELETE_VENUE);
  const toast = useToast();

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("adminLoggedIn");

    if (isAdminLoggedIn !== "true") {
      router.push("/signin");
    }
  }, [router]);

  const handleChange = (field: string, value: string) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
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
  };

  const saveVenue = async () => {
    if (
      !form.name ||
      !form.location ||
      !form.capacity ||
      !form.price ||
      !form.description ||
      !form.image ||
      !form.vendorId
    ) {
      toast({
        title: "Incomplete Details.",
        description: "All fields except suitabilities are mandatory.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
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
      await refetch();
    } catch (error: any) {
      toast({
        title: "Save failed.",
        description:
          error.message || "The venue couldn't be saved.",
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
      await refetch();
    } catch {
      toast({
        title: "Delete failed.",
        description: "Venue couldn't be deleted.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box maxW="1200px" mx="auto" mt={10} p={6}>
      <VStack align="stretch" spacing={5}>
        <Box>
          <Heading>Manage Venues</Heading>

          <Text mt={2}>
            Admin can add, edit, delete, feature, and assign vendors to venues.
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={3}>
            {isEditing ? "Edit Venue" : "Add Venue"}
          </Heading>

          <VStack align="stretch" spacing={3}>
            <Input
              placeholder="Venue name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />

            <Input
              placeholder="Location"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />

            <HStack>
              <Input
                placeholder="Capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
              />

              <Input
                placeholder="Price"
                type="number"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />
            </HStack>

            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />

            <Input
              placeholder="Image URL"
              value={form.image}
              onChange={(e) => handleChange("image", e.target.value)}
            />

            <Select
              placeholder="Assign vendor"
              value={form.vendorId}
              onChange={(e) => handleChange("vendorId", e.target.value)}
            >
              {data?.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.email}
                </option>
              ))}
            </Select>
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

            <HStack>
              <Input
                placeholder="Suitability 1"
                value={form.suitability1}
                onChange={(event) => handleChange("suitability1", event.target.value)}
              />

              <Input
                placeholder="Suitability 2"
                value={form.suitability2}
                onChange={(event) => handleChange("suitability2", event.target.value)}
              />

              <Input
                placeholder="Suitability 3"
                value={form.suitability3}
                onChange={(event) => handleChange("suitability3", event.target.value)}
              />

              <Input
                placeholder="Suitability 4"
                value={form.suitability4}
                onChange={(event) => handleChange("suitability4", event.target.value)}
              />
            </HStack>

            <HStack>
              <Button onClick={saveVenue}>
                {isEditing ? "Update Venue" : "Create Venue"}
              </Button>

              {isEditing && (
                <Button variant="outline" onClick={clearForm}>
                  Cancel
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={3}>
            Venue Management
          </Heading>

          {loading && <Spinner />}

          {error && (
            <Text color="red.500">
              Failed to load venues from GraphQL.
            </Text>
          )}

          {data && (
            <Table variant="simple" size="sm">
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
                      <HStack>
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
            </Table>
          )}
        </Box>

        <Button alignSelf="flex-start" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </VStack>
    </Box>
  );
}