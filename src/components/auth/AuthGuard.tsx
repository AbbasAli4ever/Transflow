"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

/**
 * Wrap any layout/page with this component to require authentication.
 * While auth is loading it renders nothing (prevents flash).
 * Once resolved, unauthenticated users are hard-redirected to /signin.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/signin";
    }
  }, [isLoading, isAuthenticated]);

  // Show nothing while checking or redirecting
  if (isLoading || !isAuthenticated) return null;

  return <>{children}</>;
}
