import { requestError } from "@/utils/requestError";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (!password.length) errors.push("Password is required.");
  if (password.length > 128) errors.push("Password must be 128 characters or fewer.");
  return errors;
}

export default function SignIn() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [authError, setAuthError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [signedInUser, setSignedInUser] = useState<{ email: string; role: string; name?: string } | null>(null);

  const { signIn, signOut } = useAuth();
  const router = useRouter();

  const validate = (): boolean => {
    let valid = true;

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    const pwdErrors = getPasswordErrors(password);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      valid = false;
    } else {
      setPasswordErrors([]);
    }

    return valid;
  };

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
    const user = await signIn(email, password);

    if (user) {
      if (user.role !== "hirer" && user.role !== "vendor") {
        await signOut();
        setShowSuccess(false);
        setAuthError("Administrator accounts must use the admin sign-in page.");
        return;
      }
      setSignedInUser(user);
      setShowSuccess(true);
      setTimeout(() => {
        if (user.role === "hirer") {
          router.push("/hirer");
        } else if (user.role === "vendor") {
          router.push("/vendor");
        }
      }, 1500);
    } else {
      setAuthError("Incorrect email or password. Please try again.");
    }
    } catch (error) {
      setAuthError(requestError(error, "Unable to sign in. Check your connection and try again."));
    } finally { setIsSubmitting(false); }
  };

  return (
    <>
      <Head>
        <title>Sign In — Venue Vendors</title>
        <meta
          name="description"
          content="Sign in to your Venue Vendors account"
        />
      </Head>

      <Box
        minH={{ base: "auto", md: "65vh" }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
        px={4} py={{ base: 8, md: 10 }}
      >
        <Box
          bg="white"
          p={8}
          rounded="xl"
          shadow="md"
          w="full"
          maxW="md"
          borderTop="4px solid"
          borderColor="blue.500"
        >
          <Heading
            as="h1"
            size="lg"
            textAlign="center"
            mb={6}
            color="gray.700"
          >
            Sign In
          </Heading>

          {/* Success alert */}
          {showSuccess && (
            <Alert status="success" rounded="md" mb={4}>
              <AlertIcon />
              Welcome {signedInUser?.name}!
            </Alert>
          )}

          {/* Auth error alert */}
          {authError && (
            <Alert status="error" rounded="md" mb={4}>
              <AlertIcon />
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <VStack spacing={4}>

              {/* Email field */}
              <FormControl isInvalid={!!emailError}>
                <FormLabel color="gray.600" fontSize="sm" fontWeight="semibold">
                  Email Address
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  focusBorderColor="blue.400"
                  required
                />
                <FormErrorMessage>{emailError}</FormErrorMessage>
              </FormControl>

              {/* Password field */}
              <FormControl isInvalid={passwordErrors.length > 0}>
                <FormLabel color="gray.600" fontSize="sm" fontWeight="semibold">
                  Password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  focusBorderColor="blue.400"
                  required
                />
                {passwordErrors.length > 0 && (
                  <Box mt={1}>
                    {passwordErrors.map((err) => (
                      <Text key={err} color="red.500" fontSize="xs">
                        • {err}
                      </Text>
                    ))}
                  </Box>
                )}
              </FormControl>

              {/* Submit button */}
              <Button
                type="submit" isLoading={isSubmitting} loadingText="Signing in"
                colorScheme="blue"
                w="full"
                mt={2}
              >
                Sign In
              </Button>

            </VStack>
          </form>

          {/* Sign up link */}
          <Text mt={4} textAlign="center" fontSize="sm" color="gray.500">
            Don&apos;t have an account?{" "}
            <Text as="a" color="blue.500" href = "/signup">
              Sign Up
            </Text>
          </Text>

        </Box>
      </Box>
    </>
  );
}
