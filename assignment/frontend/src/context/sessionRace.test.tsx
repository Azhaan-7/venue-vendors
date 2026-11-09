import { act, fireEvent, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authApi } from "@/services/api";
jest.mock("@/services/api", () => ({ authApi: { me: jest.fn(), signIn: jest.fn(), signOut: jest.fn() } }));
const user = { id: 1, name: "Sample", email: "sample@example.test", role: "hirer" };
function Session() {
  const { user, signIn, signOut } = useAuth();
  return <><span>{user?.email ?? "Signed out"}</span><button onClick={() => void signIn(user?.email ?? "sample@example.test", "Sample1!")}>Login</button><button onClick={() => void signOut()}>Logout</button></>;
}
test("an older failed session check cannot clear a successful login", async () => {
  let rejectMe!: (error: Error) => void;
  jest.mocked(authApi.me).mockReturnValue(new Promise((_resolve, reject) => { rejectMe = reject; }));
  jest.mocked(authApi.signIn).mockResolvedValue(user);
  render(<AuthProvider><Session /></AuthProvider>);
  fireEvent.click(screen.getByText("Login"));
  await screen.findByText(user.email);
  await act(async () => { rejectMe(new Error("Old anonymous response")); });
  expect(screen.getByText(user.email)).toBeInTheDocument();
});
test("an older successful session check cannot restore a signed-out user", async () => {
  let resolveMe!: (value: typeof user) => void;
  jest.mocked(authApi.me).mockReturnValue(new Promise(resolve => { resolveMe = resolve; }));
  jest.mocked(authApi.signOut).mockResolvedValue(undefined);
  render(<AuthProvider><Session /></AuthProvider>);
  await act(async () => { fireEvent.click(screen.getByText("Logout")); });
  await act(async () => { resolveMe(user); });
  expect(screen.getByText("Signed out")).toBeInTheDocument();
});
