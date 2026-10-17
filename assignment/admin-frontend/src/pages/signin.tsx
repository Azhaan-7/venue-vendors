import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { getPasswordErrors, isValidEmail } from "@/utils/validation";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

export default function SignIn() {
  const router = useRouter();
  const { user, isLoading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      void router.replace("/");
    }
  }, [isLoading, router, user]);

  const validate = () => {
    const nextEmailError = isValidEmail(email)
      ? ""
      : "Please enter a valid email address.";
    const nextPasswordErrors = getPasswordErrors(password);

    setEmailError(nextEmailError);
    setPasswordErrors(nextPasswordErrors);

    return !nextEmailError && nextPasswordErrors.length === 0;
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError("");

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.ok) {
      await router.push("/");
    } else if (result.reason === "not_admin") {
      setAuthError("This account does not have administrator access.");
    } else if (result.reason === "invalid_credentials") {
      setAuthError("Incorrect email or password. Please try again.");
    } else {
      setAuthError(result.message || "Unable to sign in right now. Please try again.");
    }
  };

  return (
    <Box maxW="420px" mx={{ base: 4, md: "auto" }} my={{ base: 8, md: 12 }} p={{ base: 5, md: 6 }} bg="white" borderWidth="1px" borderRadius="lg">
      <Heading mb={6} textAlign="center">
        Admin Sign In
      </Heading>

      <form onSubmit={handleSignIn} noValidate>
        <FormControl mb={4} isRequired isInvalid={!!emailError}>
          <FormLabel>Email Address</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
          />
          <FormErrorMessage>{emailError}</FormErrorMessage>
        </FormControl>

        <FormControl mb={4} isRequired isInvalid={passwordErrors.length > 0}>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          {passwordErrors.map((passwordError) => (
            <Text key={passwordError} color="red.500" fontSize="sm" mt={1}>
              • {passwordError}
            </Text>
          ))}
        </FormControl>

        {authError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {authError}
          </Alert>
        )}

        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          isLoading={isSubmitting}
          loadingText="Signing in"
        >
          Sign In
        </Button>
      </form>
    </Box>
  );
}
