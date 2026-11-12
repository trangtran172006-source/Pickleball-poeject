import type { ForgotInput, LoginInput, OtpPurpose, RegisterInput, ResetInput } from "@/shared/schemas/auth";
import { api } from "./client";

export type Role = "customer" | "staff" | "owner";
export type OtpChallenge = { maskedEmail: string; resendAvailableAt: string };

export const authApi = {
  login: (input: LoginInput) =>
    api<{ role: Role; redirect: string }>("/api/auth/login", { method: "POST", body: input }),
  logout: () => api<null>("/api/auth/logout", { method: "POST" }),
  register: (input: RegisterInput) => api<OtpChallenge>("/api/auth/register", { method: "POST", body: input }),
  forgot: (input: ForgotInput) => api<OtpChallenge>("/api/auth/forgot", { method: "POST", body: input }),
  verifyOtp: (input: { email: string; purpose: OtpPurpose; code: string }) =>
    api<{ resetToken?: string }>("/api/auth/otp/verify", { method: "POST", body: input }),
  resendOtp: (input: { email: string; purpose: OtpPurpose }) =>
    api<OtpChallenge>("/api/auth/otp/resend", { method: "POST", body: input }),
  reset: (input: ResetInput & { resetToken: string }) => api<null>("/api/auth/reset", { method: "POST", body: input }),
};
