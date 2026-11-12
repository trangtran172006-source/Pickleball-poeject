"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Session-level failures are handled in one place: an expired session goes to
 * the login screen and a staff member outside an active shift goes back to the
 * shift screen (UC_11.1 BR01–02), whichever API reported it.
 */
/** Set by <Providers> once the router is available. */
let go: (path: string) => void = () => {};

function onGlobalError(error: unknown) {
  if (!(error instanceof ApiError) || typeof window === "undefined") return;
  const path = window.location.pathname;
  if (error.code === "SHIFT_REQUIRED" && path !== "/staff/shift") go("/staff/shift");
  if (error.status === 401 && error.code === "UNAUTHORIZED" && !["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"].includes(path)) {
    go("/login");
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    go = (path) => router.replace(path);
  }, [router]);
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onGlobalError }),
        mutationCache: new MutationCache({ onError: onGlobalError }),
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
