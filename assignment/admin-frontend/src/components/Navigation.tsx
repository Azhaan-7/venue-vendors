import { requestError } from "@/utils/requestError";
import { Flex, Button, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function Navigation() {
  const toast = useToast();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const isLoggedIn = user?.role === "admin";

  const handleSignOut = async () => {
    try { await signOut(); await router.push("/signin"); }
    catch (error) { toast({ title: "Sign out failed", description: requestError(error, "Check your connection and try again."), status: "error", isClosable: true }); }
  };

  return (
    <Flex as="nav" aria-label="Main navigation" bg="gray.100" px={{ base: 3, md: 6 }} py={3} justify="center" gap={{ base: 1, md: 3 }} flexWrap="wrap">
      <Button variant="ghost" onClick={() => router.push("/")}>
        Home
      </Button>

      {!isLoading && !isLoggedIn && (
        <Button variant="ghost" onClick={() => router.push("/signin")}>
          Sign In
        </Button>
      )}

      {isLoggedIn && (
        <Button variant="ghost" onClick={handleSignOut}>
          Sign Out
        </Button>
      )}
      <Button variant="ghost" onClick={() => router.push("/about")}>About Us</Button>
    </Flex>
  );
}
