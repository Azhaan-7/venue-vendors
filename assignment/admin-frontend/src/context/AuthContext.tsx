import { requestError } from "@/utils/requestError";
import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, type SignedUser } from "@/services/api";

type SignInResult =
  | { ok: true; user: SignedUser }
  | { ok: false; reason: "invalid_credentials" | "not_admin" | "error"; message?: string };

interface AuthContextValue {
  user: SignedUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SignedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((currentUser) => setUser(currentUser.role === "admin" ? currentUser : null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    try {
      const signedUser = await authApi.signIn({ email, password });

      if (signedUser.role !== "admin") {
        await authApi.signOut();
        return { ok: false, reason: "not_admin" };
      }

      setUser(signedUser);
      return { ok: true, user: signedUser };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return { ok: false, reason: "invalid_credentials" };
      }

      return { ok: false, reason: "error", message: requestError(error, "Unable to sign in right now. Please try again.") };
    }
  };

  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
