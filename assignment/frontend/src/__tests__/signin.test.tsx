import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAuth } from "@/context/AuthContext";
import SignIn from "@/pages/signin";

jest.mock("next/router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));
const signIn = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ user: null, isLoading: false, signIn, signOut: jest.fn() });
  signIn.mockResolvedValue(null);
});

function submit(password: string) {
  render(<ChakraProvider><SignIn /></ChakraProvider>);
  fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "hirer@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);
}

test.each(["abc", "password", "  abc  "])("submits existing password %j unchanged without signup-strength checks", async password => {
  submit(password);
  expect(await screen.findByText("Incorrect email or password. Please try again.")).toBeInTheDocument();
  expect(signIn).toHaveBeenCalledWith("hirer@example.test", password);
});

test("requires a password without calling authentication", async () => {
  submit("");
  expect(await screen.findByText("• Password is required.")).toBeInTheDocument();
  expect(signIn).not.toHaveBeenCalled();
});

test("rejects oversized passwords instead of truncating or submitting them", async () => {
  submit("a".repeat(129));
  expect(await screen.findByText("• Password must be 128 characters or fewer.")).toBeInTheDocument();
  expect(signIn).not.toHaveBeenCalled();
});
