import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { useAuth } from "@/context/AuthContext";
import Navigation from "./Navigation";

jest.mock("next/router", () => ({ useRouter: () => ({ pathname: "/profile", push: jest.fn() }) }));
jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));

test.each(["hirer", "vendor"] as const)("keeps a %s workspace link available from the profile page", role => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, email: "sample@example.test", name: "Sample", role }, isLoading: false, signIn: jest.fn(), signOut: jest.fn() });
  render(<ChakraProvider><Navigation /></ChakraProvider>);
  expect(screen.getByRole("link", { name: "My workspace" })).toHaveAttribute("href", `/${role}`);
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
});
