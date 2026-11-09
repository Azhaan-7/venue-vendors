import axios from "axios";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { authApi } from "@/services/api";

export interface SignedUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: SignedUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignedUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SignedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sessionVersion = useRef(0);

  useEffect(() => {
    const version = sessionVersion.current;
    let active = true;
    authApi.me()
      .then(currentUser => { if (active && version === sessionVersion.current) setUser(currentUser); })
      .catch(() => { if (active && version === sessionVersion.current) setUser(null); })
      .finally(() => { if (active && version === sessionVersion.current) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = async(email: string, password: string): Promise<SignedUser | null> => {
    sessionVersion.current++;
    setIsLoading(false);
    try {
      const data = await authApi.signIn({ email, password });
      const signedUser: SignedUser = { id: data.id, email: data.email, role: data.role, name: data.name };
      setUser(signedUser);
      return signedUser;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return null;
      throw error;
    }
  };

  const signOut = async () => {
    sessionVersion.current++;
    setIsLoading(false);
    await authApi.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
