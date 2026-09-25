import { useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

export default function SignIn() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (username === "admin" && password === "admin") {
      localStorage.setItem("adminLoggedIn", "true");
      router.push("/");
      return;
    }

    setError("Invalid admin username or password.");
  };

  return (
    <Box maxW="420px" mx="auto" mt={12} p={6} borderWidth="1px" borderRadius="lg">
      <Heading mb={6} textAlign="center">
        Admin Sign In
      </Heading>

      <form onSubmit={handleSignIn}>
        <FormControl mb={4} isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
          />
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
        </FormControl>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Button type="submit" colorScheme="blue" width="100%">
          Sign In
        </Button>
      </form>

    </Box>
  );
}