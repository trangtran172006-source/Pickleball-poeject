"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localeLabels, locales, type AppLocale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

type Props = {
  /** "light" sits on white surfaces, "dark" on the green top bar. */
  tone?: "light" | "dark";
};

/**
 * VI / EN toggle. It stores the choice in a cookie and re-renders the current
 * route in place, so typed form values, the current step and the login session
 * are all kept.
 */
export function LanguageSwitcher({ tone = "light" }: Props) {
  const t = useTranslations("common");
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: AppLocale) => {
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };

  const names: Record<AppLocale, string> = { vi: t("switchToVi"), en: t("switchToEn") };
  const frame =
    tone === "dark" ? "border-white/40 bg-white/10" : "border-line bg-white";

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`inline-flex shrink-0 items-center rounded-full border p-0.5 text-[11px] font-semibold ${frame} ${pending ? "opacity-60" : ""}`}
    >
      {locales.map((locale) => {
        const selected = locale === active;
        const color = selected
          ? tone === "dark"
            ? "bg-white text-brand"
            : "bg-brand text-white"
          : tone === "dark"
            ? "text-white/85 hover:text-white"
            : "text-muted hover:text-ink";
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            title={names[locale]}
            aria-label={names[locale]}
            aria-pressed={selected}
            disabled={pending}
            onClick={() => choose(locale)}
            className={`rounded-full px-2.5 py-1 leading-none transition-colors ${color}`}
          >
            {localeLabels[locale]}
          </button>
        );
      })}
    </div>
  );
}
