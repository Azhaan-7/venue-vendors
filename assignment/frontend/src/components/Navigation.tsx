import NextLink from "next/link";
import { requestError } from "@/utils/requestError";
import { Flex, Button, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function Navigation() {
  const toast = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const handleSignOut = async () => {
    try { await signOut(); await router.push("/"); }
    catch (error) { toast({ title: "Sign out failed", description: requestError(error, "Check your connection and try again."), status: "error", isClosable: true }); }
  };
  const links = [{ href: "/", label: "Home" }, ...(user ? [{ href: user.role === "vendor" ? "/vendor" : "/hirer", label: "My workspace" }, { href: "/profile", label: "Profile" }] : []), { href: "/about", label: "About us" }];
  return <Flex as="nav" aria-label="Main navigation" borderBottomWidth="1px" borderColor="gray.200" px={{ base: 3, md: 6 }} py={2} gap={1} flexWrap="wrap" maxW="1200px" w="full" mx="auto" align="center">
    {links.map(({ href, label }) => <Button key={href} as={NextLink} href={href} variant="ghost" aria-current={router.pathname === href ? "page" : undefined} bg={router.pathname === href ? "blue.50" : undefined}>{label}</Button>)}
    <Flex ml="auto" gap={1}>{user ? <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button> : <><Button as={NextLink} href="/signin" variant="ghost">Sign In</Button><Button as={NextLink} href="/signup">Sign up</Button></>}</Flex>
  </Flex>;
}
