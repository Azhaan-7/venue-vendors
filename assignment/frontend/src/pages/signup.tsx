import { requestError } from "@/utils/requestError";
import { useState } from "react";
import { useRouter } from "next/router";
import {Box,Button,FormControl,FormLabel,FormErrorMessage,Heading,Input,Select,VStack,Alert,AlertIcon,Text,} from "@chakra-ui/react";
import { authApi } from "../services/api";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 6) errors.push("At least 6 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/\d/.test(password)) errors.push("At least one number");
  if (!/[@$!%*?&]/.test(password))
    errors.push("At least one special character (@$!%*?&)");
  return errors;
}

export default function SignUp() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hirer");

  const [emailError, setEmailError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    let valid = true;

    if (!isValidEmail(email)) {
      setEmailError("Invalid email");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await authApi.signUp({name,email,password,role,});
      setSuccess(true);
      setTimeout(() => {
        router.push("/signin");}, 1500);

    } catch (error) {
      setServerError(
        requestError(error, "Unable to create your account. Check your connection and try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      minH={{ base: "auto", md: "65vh" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
      px={4} py={8}>
      <Box
        bg="white"
        p={8}
        rounded="xl"
        shadow="md"
        w="full"
        maxW="md">
        <Heading textAlign="center" mb={6}>Sign Up</Heading>

        {success && (
          <Alert status="success" mb={4}><AlertIcon />Account created successfully!</Alert>
        )}

        {serverError && (
          <Alert status="error" mb={4}><AlertIcon />{serverError}</Alert>
        )}

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }/>
            </FormControl>

            <FormControl isInvalid={!!emailError}>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) =>setEmail(e.target.value)}/>
              <FormErrorMessage>{emailError}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={passwordErrors.length > 0}>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password}
                onChange={(e) =>
                  setPassword(e.target.value)}/>
              {passwordErrors.map((err) => (
                <Text key={err} color="red.500" fontSize="sm">{err}</Text>
              ))}
            </FormControl>

            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="hirer">Hirer</option>
                <option value="vendor">Vendor</option>
              </Select>
            </FormControl>

            <Button isLoading={isSubmitting} loadingText="Creating account" isDisabled={success} type="submit" colorScheme="blue" w="full">Sign Up</Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}