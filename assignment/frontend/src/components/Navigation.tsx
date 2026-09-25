import { Flex, Button } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function Navigation () {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
        signOut();
        router.push("/");
    };

  return (
    <Flex bg="gray.100" p={3} justify="center" gap={4}>
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
        <Button variant="ghost" isDisabled>About</Button>
        <Button variant="ghost" isDisabled>Contact Us</Button>
    </Flex>
  );
}