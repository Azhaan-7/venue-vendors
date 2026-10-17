import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import SignIn from "@/pages/signin";
import { authApi } from "@/services/api";

jest.mock("next/router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services/api", () => ({ authApi: { me: jest.fn(), signIn: jest.fn(), signOut: jest.fn() } }));
const sample = { id: 1, name: "Sample", email: "sample@example.test", role: "hirer" };

test("a throttled sign-in reaches the UI without being called an incorrect password", async () => {
  jest.mocked(authApi.me).mockRejectedValue(new Error("No session"));
  jest.mocked(authApi.signIn).mockRejectedValue({ isAxiosError: true, response: { status: 429, headers: { "retry-after": "20" } } });
  render(<ChakraProvider><AuthProvider><SignIn /></AuthProvider></ChakraProvider>);
  fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: sample.email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Sample1!" } });
  fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);
  expect(await screen.findByText("Too many requests. Please try again in 20 seconds.")).toBeInTheDocument();
  expect(screen.queryByText("Incorrect email or password. Please try again.")).not.toBeInTheDocument();
});

function Session() {
  const { user, signOut } = useAuth();
  return <><span>{user?.email ?? "Signed out"}</span><button onClick={() => { void signOut().catch(() => undefined); }}>Sign out</button></>;
}

test("failed logout retains local session state until the cookie can be cleared", async () => {
  jest.mocked(authApi.me).mockResolvedValue(sample);
  jest.mocked(authApi.signOut).mockRejectedValue(new Error("Network failure"));
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText(sample.email);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(authApi.signOut).toHaveBeenCalled());
  expect(screen.getByText(sample.email)).toBeInTheDocument();
});
