"use client";

import Link from "next/link";
import { CalendarPlus, MapPin, Phone, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PricingTable } from "@/components/features/booking/PricingTable";
import { ChatbotLauncher } from "@/components/features/chatbot/ChatbotLauncher";
import { courtsApi } from "@/services/api/customer";

/** B5 – Trang chủ công khai cho khách vãng lai (không cần đăng nhập). */
export function PublicHome() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: courtsApi.settings, staleTime: 300_000 });
  const hotline = settings.data?.hotline || tc("phone");

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-4 py-3 lg:px-6">
          <Brand href="/" name={tc("appName")} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/login" className="hidden text-[13px] font-medium text-brand hover:underline sm:inline">
              {t("publicLogin")}
            </Link>
            <Link href="/register">
              <Button>{t("publicRegister")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#1A6C2E] bg-[url('/images/auth-bg.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[#0d3b1a]/60" />
        <div className="relative mx-auto max-w-[1120px] px-4 py-16 text-white lg:px-6 lg:py-24">
          <p className="text-sm font-medium text-white/85">{tc("clubName")}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-[40px]">{t("publicHeroTitle")}</h1>
          <p className="mt-4 max-w-xl text-sm text-white/90 sm:text-base">{t("publicHeroSub", { club: tc("clubName") })}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login">
              <Button iconLeft={<CalendarPlus aria-hidden className="size-4" />}>{t("publicBookNow")}</Button>
            </Link>
            <a href="#pricing">
              <Button variant="neutral" iconLeft={<Tag aria-hidden className="size-4" />}>{t("publicViewPrices")}</Button>
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/90 sm:text-[13px]">
            <span className="inline-flex items-center gap-2"><MapPin aria-hidden className="size-4" /> {tc("address")}</span>
            <a href={`tel:${hotline}`} className="inline-flex items-center gap-2 hover:underline"><Phone aria-hidden className="size-4" /> {t("publicHotline")}: {hotline}</a>
          </div>
        </div>
      </section>

      <main id="pricing" className="mx-auto max-w-[1120px] px-4 py-12 lg:px-6">
        <h2 className="text-xl font-semibold text-ink">{t("publicPricesTitle")}</h2>
        <p className="mt-1 text-xs text-muted">{t("publicWalkinNote")}</p>
        <div className="mt-5">
          <PricingTable />
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-2 px-4 py-7 text-xs text-muted lg:px-6">
          <span className="font-semibold text-ink">{tc("appName")} · {tc("clubName")}</span>
          <span className="inline-flex items-center gap-2"><MapPin aria-hidden className="size-3.5" /> {tc("address")}</span>
          <span className="inline-flex items-center gap-2"><Phone aria-hidden className="size-3.5" /> {hotline}</span>
        </div>
      </footer>

      <ChatbotLauncher />
    </div>
  );
}
