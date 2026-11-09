import NextLink from "next/link";
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
    <Flex as="nav" aria-label="Main navigation" borderBottomWidth="1px" borderColor="gray.200" maxW="1200px" w="full" mx="auto" px={{ base: 3, md: 6 }} py={2} gap={1} flexWrap="wrap">
      {(isLoggedIn ? [{ href: "/", label: "Overview" }, { href: "/venues", label: "Venues" }, { href: "/reports", label: "Reports" }] : [{ href: "/", label: "Home" }]).map(({ href, label }) => <Button key={href} as={NextLink} href={href} variant="ghost" aria-current={router.pathname === href ? "page" : undefined} bg={router.pathname === href ? "blue.50" : undefined}>{label}</Button>)}
      <Button as={NextLink} href="/about" variant="ghost">About Us</Button>
      {!isLoading && !isLoggedIn && <Button as={NextLink} href="/signin" ml="auto">Sign In</Button>}
      {isLoggedIn && <Button variant="ghost" ml="auto" onClick={handleSignOut}>Sign Out</Button>}
    </Flex>
  );
}
