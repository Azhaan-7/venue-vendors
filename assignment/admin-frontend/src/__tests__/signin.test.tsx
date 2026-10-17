import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import SignIn from "@/pages/signin";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseAuth = jest.mocked(useAuth);
const push = jest.fn();
const replace = jest.fn();
const signIn = jest.fn();

function renderSignIn() {
  return render(
    <ChakraProvider>
      <SignIn />
    </ChakraProvider>
  );
}

describe("Admin sign in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({ push, replace } as never);
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      signIn,
      signOut: jest.fn(),
    });
  });

  it("validates the email and password before authenticating", async () => {
    renderSignIn();

    fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("• At least 6 characters")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows an error for invalid credentials", async () => {
    signIn.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/Email Address/), "admin@example.com");
    await user.type(screen.getByLabelText(/Password/), "Admin1!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Incorrect email or password. Please try again.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects an authenticated non-admin user", async () => {
    signIn.mockResolvedValue({ ok: false, reason: "not_admin" });
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/Email Address/), "vendor@example.com");
    await user.type(screen.getByLabelText(/Password/), "Vendor1!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("This account does not have administrator access.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects an authenticated admin to the dashboard", async () => {
    signIn.mockResolvedValue({
      ok: true,
      user: { id: 1, email: "admin@example.com", role: "admin", name: "Admin" },
    });
    push.mockResolvedValue(true);
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/Email Address/), "admin@example.com");
    await user.type(screen.getByLabelText(/Password/), "Admin1!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows a throttling explanation from authentication instead of incorrect credentials", async () => {
    signIn.mockResolvedValue({ ok: false, reason: "error", message: "Too many requests. Please wait before trying again." });
    renderSignIn();
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "admin@example.test" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "Sample1!" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);
    expect(await screen.findByText("Too many requests. Please wait before trying again.")).toBeInTheDocument();
    expect(screen.queryByText("Incorrect email or password. Please try again.")).not.toBeInTheDocument();
  });
});
