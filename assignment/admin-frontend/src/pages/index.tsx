import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("adminLoggedIn");

    if (isAdminLoggedIn !== "true") {
      router.push("/signin");
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem("adminLoggedIn");
    router.push("/signin");
  };

  return (
    <Box maxW="1100px" mx="auto" mt={10} p={6}>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading>Admin Dashboard</Heading>
          <Text mt={2}>
            Manage venues, featured listings, vendor assignments, and reports.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={3}>
              Manage Venues
            </Heading>
            <Text mb={4}>
              Perform CRUD operations on venues and assign vendors to venues.
            </Text>
            <Button width="100%" onClick={() => router.push("/venues")}>
              Open
            </Button>
          </Box>


          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={3}>
              Reports
            </Heading>
            <Text mb={4}>
              View popular venues and active applicant summaries.
            </Text>
            <Button width="100%" onClick={() => router.push("/reports")}>
              Open
            </Button>
          </Box>
        </SimpleGrid>

        <Button alignSelf="flex-start" colorScheme="red" onClick={handleSignOut}>
          Sign Out
        </Button>
      </VStack>
    </Box>
  );
}