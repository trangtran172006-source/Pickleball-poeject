"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { OtpPurpose } from "@/shared/schemas/auth";

/**
 * State carried between the authentication screens. It lives in
 * sessionStorage so the email never appears in the URL and the flow survives
 * a language switch or a reload of the tab.
 */
export type OtpContext = { email: string; maskedEmail: string; purpose: OtpPurpose; resendAvailableAt: string };
export type ResetContext = { resetToken: string; maskedEmail: string };

const OTP_KEY = "ph.otp";
const RESET_KEY = "ph.reset";
const listeners = new Set<() => void>();

function readRaw(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: unknown | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the flow simply restarts from the first screen */
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** undefined while the page is still hydrating, null when nothing is stored. */
function useStored<T>(key: string): T | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => undefined,
  );
  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}

export const authFlow = {
  setOtp: (value: OtpContext | null) => write(OTP_KEY, value),
  setReset: (value: ResetContext | null) => write(RESET_KEY, value),
};
export const useOtpContext = () => useStored<OtpContext>(OTP_KEY);
export const useResetContext = () => useStored<ResetContext>(RESET_KEY);
