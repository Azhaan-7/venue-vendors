import { requestError } from "@/utils/requestError";
import { Flex, Button, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function Navigation () {
    const toast = useToast();
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        try { await signOut(); await router.push("/"); }
        catch (error) { toast({ title: "Sign out failed", description: requestError(error, "Check your connection and try again."), status: "error", isClosable: true }); }
    };

  return (
    <Flex as="nav" aria-label="Main navigation" bg="gray.100" px={{ base: 3, md: 6 }} py={3} justify="center" gap={{ base: 1, md: 3 }} flexWrap="wrap">
        <Button variant="ghost" onClick={() => router.push("/")}>Home</Button>
        {!user && (
            <>
                <Button variant="ghost" onClick={() => router.push("/signin")}>Sign In</Button>
                <Button variant="ghost" onClick={() => router.push("/signup")}>Sign up</Button>
            </>
        )}
        {user && (
            <>
                <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
                <Button variant="ghost" onClick={() => router.push("/profile")}>Profile</Button>
            </>
        )}
        <Button variant="ghost" onClick={() => router.push("/about")}>About Us</Button>
        <Button variant="ghost" isDisabled>Contact Us</Button>
    </Flex>
  );
}
