import { useRouter } from "next/router";
import {
  Box,
  Button,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { requestError } from "@/utils/requestError";

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const toast = useToast();
  const { isAdmin, isCheckingAuth } = useRequireAdmin();

  const handleSignOut = async () => {
    try {
      await signOut();
      await router.push("/signin");
    } catch (error) {
      toast({ title: "Could not sign out", description: requestError(error, "Please try again."), status: "error", isClosable: true });
    }
  };

  if (isCheckingAuth || !isAdmin) {
    return <Spinner display="block" mx="auto" mt={12} />;
  }

  return (
    <Box maxW="1100px" mx="auto" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading>Admin Dashboard</Heading>
          <Text mt={2}>
            Manage venues, featured listings, vendor assignments, and reports.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
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


          <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
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
