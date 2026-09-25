import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/services/api";

export interface SignedUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: SignedUser | null;
  signIn: (email: string, password: string) => Promise<SignedUser | null>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SignedUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("vv_current_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signIn = async(email: string, password: string): Promise<SignedUser | null> => {
    try {
      const data = await authApi.signIn({ email, password });
      const signedUser: SignedUser = { id: data.id, email: data.email, role: data.role, name: data.name };
      setUser(signedUser);
      localStorage.setItem("vv_current_user", JSON.stringify(signedUser));
      return signedUser;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("vv_current_user");
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
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