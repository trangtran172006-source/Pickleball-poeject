import { randomInt } from "crypto";

/** 6-digit numeric OTP. */
export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
/** Short unique id with a prefix, for rows created outside the SQL functions. */
export function shortId(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = randomInt(0, 36 ** 3).toString(36).toUpperCase().padStart(3, "0");
  return (prefix + t + r).slice(0, 14);
}
/** Mask an email for OTP challenge responses: ab***@domain. */
export function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  const head = u.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}
