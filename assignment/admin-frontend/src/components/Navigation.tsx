import { Flex, Button } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Navigation() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("adminLoggedIn") === "true");
  }, [router.pathname]);

  const handleSignOut = () => {
    localStorage.removeItem("adminLoggedIn");
    setIsLoggedIn(false);
    router.push("/signin");
  };

  return (
    <Flex bg="gray.100" p={3} justify="center" gap={4}>
      <Button variant="ghost" onClick={() => router.push("/")}>
        Home
      </Button>

      {!isLoggedIn && (
        <Button variant="ghost" onClick={() => router.push("/signin")}>
          Sign In
        </Button>
      )}

      {isLoggedIn && (
        <Button variant="ghost" onClick={handleSignOut}>
          Sign Out
        </Button>
      )}
    </Flex>
  );
}