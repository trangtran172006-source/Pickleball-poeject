import { TIME_ZONE } from "@/i18n/config";

/** Calendar dates are handled as "YYYY-MM-DD" strings in the club time zone. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Current wall-clock time in the club time zone as "HH:mm". */
export function nowClock(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

const toUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fromUTC = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const date = toUTC(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTC(date);
}

export function addMonths(iso: string, months: number): string {
  const date = toUTC(`${iso.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return fromUTC(date);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayIndex(iso: string): number {
  return toUTC(iso).getUTCDay();
}

/** The Sunday-to-Saturday week containing the date, as in the booking date strip. */
export function weekOf(iso: string): string[] {
  const start = addDays(iso, -weekdayIndex(iso));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function daysInMonth(iso: string): number {
  const date = toUTC(`${iso.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.getUTCDate();
}

export const toMinutes = (clock: string) => +clock.slice(0, 2) * 60 + +clock.slice(3, 5);
export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
