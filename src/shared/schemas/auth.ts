import { z } from "zod";

/**
 * Validation shared by the forms and the API. Messages are keys of the
 * `validation` translation namespace, never display text.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^0\d{9}$/;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const GENDERS = ["Nam", "Nữ", "Khác"] as const;
export const OTP_PURPOSES = ["register", "reset"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

const requiredText = (max = 100) => z.string().trim().min(1, "required").max(max, "wrongFormat");
export const emailField = requiredText(100).regex(EMAIL_PATTERN, "emailInvalid").transform((value) => value.toLowerCase());
export const phoneField = requiredText(15).regex(PHONE_PATTERN, "phoneInvalid");
export const passwordField = z.string().min(1, "required").regex(PASSWORD_PATTERN, "passwordRule");

export const loginSchema = z.object({
  email: requiredText(100),
  password: z.string().min(1, "required"),
});

export const registerSchema = z
  .object({
    email: emailField,
    phone: phoneField,
    fullName: requiredText(100),
    birthYear: z
      .string()
      .trim()
      .refine((value) => value === "" || (/^\d{4}$/.test(value) && +value >= 1900 && +value <= new Date().getFullYear()), "birthYearInvalid"),
    gender: z.union([z.enum(GENDERS), z.literal("")]),
    password: passwordField,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "passwordMismatch" });

export const otpSchema = z.object({
  code: z.string().trim().min(1, "required").regex(/^\d{6}$/, "wrongFormat"),
});

export const forgotSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "passwordMismatch" });

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type OtpInput = z.input<typeof otpSchema>;
export type ForgotInput = z.input<typeof forgotSchema>;
export type ResetInput = z.input<typeof resetSchema>;
