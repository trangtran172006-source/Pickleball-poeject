"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api/auth";

/** UC_12: signs out immediately (no confirmation dialog) and shows the login screen. */
export function useLogout() {
  const router = useRouter();
  const client = useQueryClient();
  return useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      client.clear();
      router.replace("/login");
      router.refresh();
    }
  }, [client, router]);
}
