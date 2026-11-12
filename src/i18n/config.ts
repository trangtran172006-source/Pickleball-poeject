/**
 * Central i18n configuration.
 * To add a language: add its code here, add a label, and create
 * `messages/<code>/` with the same namespace files as `messages/vi/`.
 */
export const locales = ["vi", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "vi";
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** All business dates and times are evaluated in the club's time zone. */
export const TIME_ZONE = "Asia/Ho_Chi_Minh";

export const localeLabels: Record<AppLocale, string> = {
  vi: "VI",
  en: "EN",
};

/** BCP 47 tags used by Intl formatters. */
export const intlTags: Record<AppLocale, string> = {
  vi: "vi-VN",
  en: "en-GB",
};

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
