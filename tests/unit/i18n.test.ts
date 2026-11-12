import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "../../src/i18n/config";
import { createFormatters } from "../../src/i18n/format";
import * as status from "../../src/i18n/status";

const root = join(__dirname, "../../src/i18n/messages");
const load = (locale: string, file: string) =>
  JSON.parse(readFileSync(join(root, locale, file), "utf8")) as Record<string, string>;
const files = (locale: string) => readdirSync(join(root, locale)).filter((f) => f.endsWith(".json")).sort();
const placeholders = (text: string) => {
  // Top-level ICU argument names only: "{count, plural, one {# hour}}" -> count
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) names.add(/^\{\s*(\w+)/.exec(text.slice(i))?.[1] ?? "");
      depth++;
    } else if (text[i] === "}") depth--;
  }
  return [...names].sort();
};

describe("translation resources", () => {
  const base = locales[0];

  it("every language has the same namespace files", () => {
    for (const locale of locales) expect(files(locale)).toEqual(files(base));
  });

  it("every namespace has the same keys, no empty text, same placeholders", () => {
    for (const file of files(base)) {
      const reference = load(base, file);
      for (const locale of locales) {
        const current = load(locale, file);
        expect(Object.keys(current).sort(), `${locale}/${file}`).toEqual(Object.keys(reference).sort());
        for (const [key, text] of Object.entries(current)) {
          expect(text.trim().length, `${locale}/${file}:${key}`).toBeGreaterThan(0);
          expect(placeholders(text), `${locale}/${file}:${key}`).toEqual(placeholders(reference[key]));
        }
      }
    }
  });

  it("every stored status value maps to an existing translation key", () => {
    const statusKeys = Object.keys(load(base, "status.json"));
    const commonKeys = Object.keys(load(base, "common.json"));
    const inStatus = [status.bookingStatusKey, status.paymentStatusKey, status.courtStatusKey, status.closureReasonKey, status.shiftStatusKey, status.accountStatusKey];
    const inCommon = [status.genderKey, status.dayGroupKey, status.shiftNameKey];
    for (const map of inStatus) for (const key of Object.values(map)) expect(statusKeys).toContain(key);
    for (const map of inCommon) for (const key of Object.values(map)) expect(commonKeys).toContain(key);
  });
});

describe("formatters", () => {
  const vi = createFormatters("vi");
  const en = createFormatters("en");

  it("formats currency per language", () => {
    expect(vi.currency(320000)).toBe("320.000đ");
    expect(en.currency(320000)).toBe("320,000 VND");
  });

  it("formats dates per language in the club time zone", () => {
    expect(vi.date("2026-11-02")).toBe("02/11/2026");
    expect(en.date("2026-11-02")).toBe("02 Nov 2026");
    expect(vi.dateLong("2026-11-02")).toBe("Thứ Hai, 02/11/2026");
    expect(en.dateLong("2026-11-02")).toBe("Monday, 02 Nov 2026");
    // 17:30 UTC is 00:30 the next day in Da Nang
    expect(vi.date("2026-11-01T17:30:00Z")).toBe("02/11/2026");
  });

  it("uses a 24-hour clock in both languages", () => {
    expect(vi.time("2026-11-02T11:00:00Z")).toBe("18:00");
    expect(en.time("2026-11-02T11:00:00Z")).toBe("18:00");
    expect(en.timeRange("18:00:00", "20:00:00")).toBe("18:00 – 20:00");
  });
});
