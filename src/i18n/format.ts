import { intlTags, TIME_ZONE, type AppLocale } from "./config";

/**
 * Locale-aware formatters shared by server and client code.
 * vi: 02/11/2026 · 320.000đ      en: 2 Nov 2026 · 320,000 VND
 * Time of day is always shown on a 24-hour clock, as in the design.
 */
export function createFormatters(locale: AppLocale) {
  const tag = intlTags[locale];
  const number = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const dateShort = new Intl.DateTimeFormat(tag, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: locale === "vi" ? "2-digit" : "short",
    year: "numeric",
  });
  const dateLong = new Intl.DateTimeFormat(tag, {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: locale === "vi" ? "2-digit" : "short",
    year: "numeric",
  });
  const weekday = new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, weekday: "long" });
  const weekdayShort = new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, weekday: "short" });
  const monthYear = new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, month: "long", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const toDate = (value: Date | string) =>
    typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value) : value;
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  return {
    number: (value: number) => number.format(value),
    currency: (value: number) =>
      locale === "vi" ? `${number.format(value)}đ` : `${number.format(value)} VND`,
    date: (value: Date | string) => dateShort.format(toDate(value)),
    dateLong: (value: Date | string) => capitalize(dateLong.format(toDate(value))),
    weekday: (value: Date | string) => capitalize(weekday.format(toDate(value))),
    weekdayShort: (value: Date | string) => capitalize(weekdayShort.format(toDate(value))),
    monthYear: (value: Date | string) => capitalize(monthYear.format(toDate(value))),
    time: (value: Date | string) => time.format(toDate(value)),
    dateTime: (value: Date | string) =>
      `${dateShort.format(toDate(value))} · ${time.format(toDate(value))}`,
    /** "18:00:00" -> "18:00" */
    clock: (value: string) => value.slice(0, 5),
    timeRange: (start: string, end: string) => `${start.slice(0, 5)} – ${end.slice(0, 5)}`,
    fileSize: (bytes: number) =>
      bytes >= 1024 * 1024
        ? `${number.format(Math.round((bytes / 1024 / 1024) * 10) / 10)} MB`
        : `${number.format(Math.max(1, Math.round(bytes / 1024)))} KB`,
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
