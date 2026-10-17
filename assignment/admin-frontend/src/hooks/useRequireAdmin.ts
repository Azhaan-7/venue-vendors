import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export function useRequireAdmin() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user?.role !== "admin") {
      void router.replace("/signin");
    }
  }, [isLoading, router, user]);

  return {
    isCheckingAuth: isLoading,
    isAdmin: !isLoading && user?.role === "admin",
  };
}
