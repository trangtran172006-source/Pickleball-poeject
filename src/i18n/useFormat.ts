"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "./config";
import { createFormatters } from "./format";

/** Client hook: formatters for the active language. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(() => createFormatters(isLocale(locale) ? locale : defaultLocale), [locale]);
}
