"use client";

import { useQuery } from "@tanstack/react-query";
import { meApi } from "@/services/api/customer";

/** The signed-in user. Shared by layouts and pages through the query cache. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: meApi.get, staleTime: 60_000 });
}
