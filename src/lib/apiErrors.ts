"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/services/api/client";

/** API error code -> translation key. Unknown codes fall back to a generic message. */
const codeToKey = {
  NETWORK: "errors.network",
  INTERNAL: "errors.generic",
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  VALIDATION: "validation.wrongFormat",
  SHIFT_REQUIRED: "errors.shiftRequired",
  LOGIN_FAILED: "auth.loginFailed",
  ACCOUNT_LOCKED: "auth.accountLocked",
  NOT_VERIFIED: "auth.notVerified",
  ACCOUNT_EXISTS: "auth.accountExists",
  ACCOUNT_NOT_FOUND: "auth.accountNotFound",
  OTP_WRONG: "auth.otpWrong",
  OTP_TOO_MANY: "auth.otpTooMany",
  OTP_EXPIRED: "auth.otpExpired",
  WRONG_CURRENT_PASSWORD: "errors.wrongCurrentPassword",
  SLOT_TAKEN: "errors.slotTaken",
  PAST_DATE: "errors.pastDate",
  COURT_CLOSED: "errors.courtClosed",
  HOLD_EXPIRED: "errors.holdExpired",
  PAYMENT_INVALID: "errors.paymentInvalid",
  CANCEL_NOT_ALLOWED: "errors.cancelNotAllowed",
  BOOKING_NOT_FOUND: "errors.bookingNotFound",
  SLOT_INVALID: "errors.slotInvalid",
  REFUND_NOT_ALLOWED: "errors.refundNotAllowed",
  PROOF_REQUIRED: "validation.proofRequired",
  OUT_OF_STOCK: "errors.outOfStock",
  ORDER_FAILED: "errors.orderFailed",
  STAFF_NOT_FOUND: "errors.staffNotFound",
  STAFF_EMAIL_INVALID: "errors.staffEmailInvalid",
  EMAIL_IN_USE: "errors.emailInUse",
  SHIFT_HOURS_RANGE: "errors.shiftHoursRange",
  SHIFT_OVERLAP: "errors.shiftOverlap",
  SHIFT_LOCKED: "errors.shiftLocked",
  PRICE_RULE: "validation.priceRule",
} as const;

type Translator = (key: string) => string;

/** Returns a function that turns any thrown value into text in the active language. */
export function useApiErrorMessage() {
  const t = useTranslations() as unknown as Translator;
  return useCallback(
    (error: unknown, fallbackKey: string = "errors.generic") => {
      const code = error instanceof ApiError ? error.code : "";
      return t((codeToKey as Record<string, string>)[code] ?? fallbackKey);
    },
    [t],
  );
}

/** Translates a validation key coming from a Zod schema or an API field error. */
export function useValidationMessage() {
  const t = useTranslations("validation") as unknown as Translator & { has: (key: string) => boolean };
  return useCallback(
    (key: string | undefined) => (key ? (t.has(key) ? t(key) : t("wrongFormat")) : undefined),
    [t],
  );
}
