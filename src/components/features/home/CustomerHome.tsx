"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarDays, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { useMe } from "@/lib/useMe";
import { useFormat } from "@/i18n/useFormat";
import { customerApi } from "@/services/api/customer";

/** UI_6 – customer home: greeting banner, suggested times, next booking, club photo. */
export function CustomerHome() {
  const t = useTranslations("home");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const f = useFormat();
  const me = useMe();
  const home = useQuery({ queryKey: ["customer-home"], queryFn: customerApi.home });
  const upcoming = home.data?.upcoming;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-[20px] bg-gradient-to-r from-brand via-[#2c8a4b] to-[#2f7d43] p-6 text-white sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/90">{me.data ? t("greeting", { name: me.data.fullName }) : " "}</p>
          <h1 className="mt-3 text-[26px] font-medium leading-[1.25] sm:text-[32px]">
            {t("heroLine1")}
            <br />
            {t("heroLine2")}
          </h1>
          <p className="mt-4 text-[13px] text-white/90">{t("heroSub")}</p>
        </div>
        <div className="w-full shrink-0 rounded-2xl border border-white/25 bg-white/10 p-4 lg:w-[355px]">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <CalendarCheck aria-hidden className="size-4" strokeWidth={1.75} />
            {t("alwaysSlot")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {home.isPending
              ? Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-white/15" />)
              : (home.data?.suggestions ?? []).slice(0, 3).map((slot, index) => (
                  <Link
                    key={`${slot.date}-${slot.time}`}
                    href={`/customer/booking?date=${slot.date}&time=${slot.time}`}
                    data-suggestion
                    className={
                      index === 1
                        ? "flex h-16 flex-col items-center justify-center rounded-lg bg-white text-brand"
                        : "flex h-16 flex-col items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
                    }
                  >
                    <span className="text-sm font-semibold">{slot.time}</span>
                    <span className="mt-1 text-[10px] opacity-90">{t("slotFree")}</span>
                  </Link>
                ))}
            {home.data && home.data.suggestions.length === 0 && <p className="col-span-3 py-4 text-center text-xs text-white/85">{t("noUpcoming")}</p>}
          </div>
        </div>
      </section>

      <Card className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div className="flex items-center gap-3.5">
          <MapPin aria-hidden className="size-5 text-brand" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] text-subtle">{t("area")}</p>
            <p className="mt-0.5 text-[13px] font-medium text-ink">{t("areaValue")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <CalendarDays aria-hidden className="size-5 text-brand" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] text-subtle">{t("bookingDate")}</p>
            <p className="mt-0.5 text-[13px] font-medium text-ink">{home.data ? f.date(home.data.today) : "—"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 *:min-w-0 lg:grid-cols-[minmax(0,1.86fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium text-ink">{t("upcoming")}</h2>
            <Link href="/customer/bookings" className="text-xs font-semibold text-brand hover:underline">
              {tn("myBookings")}
            </Link>
          </div>
          {home.isPending ? (
            <Skeleton className="mt-4 h-16 w-full" />
          ) : home.isError ? (
            <ErrorState error={home.error} onRetry={() => home.refetch()} className="px-0 pb-0" />
          ) : upcoming ? (
            <Link href={`/customer/bookings/${upcoming.id}`} data-upcoming className="mt-4 flex items-center gap-5 rounded-lg hover:bg-page">
              <span className="flex h-[66px] w-[60px] shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand">
                <span className="text-[9px] font-medium uppercase">{t("month", { month: upcoming.date.slice(5, 7) })}</span>
                <span className="text-2xl font-semibold leading-tight">{upcoming.date.slice(8, 10)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {tc("appName")} · {upcoming.courtName}
                </span>
                <span className="mt-1.5 block text-[11px] text-muted">
                  {f.weekday(upcoming.date)} · {f.timeRange(upcoming.start, upcoming.end)} · {upcoming.code}
                </span>
              </span>
              <BookingStatusBadge status={upcoming.status} />
            </Link>
          ) : (
            <p data-state="empty" className="mt-4 rounded-lg bg-page px-4 py-5 text-center text-xs text-muted">
              {t("noUpcoming")}
            </p>
          )}
        </Card>
        <div className="rounded-xl bg-brand-soft/70 p-5">
          <h2 className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
            <CalendarClock aria-hidden className="size-5 text-brand" strokeWidth={1.75} />
            {t("keepTitle")}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-muted">{t("keepDesc")}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-[17px] font-medium text-ink">{t("explore")}</h2>
        <div className="relative overflow-hidden rounded-2xl">
          <Image src="/images/club-hero.jpg" alt="" width={1278} height={231} className="h-[180px] w-full object-cover sm:h-[231px]" priority />
          <Link href="/customer/booking" className="absolute right-3 top-3 flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark sm:right-4 sm:top-4 sm:h-[60px] sm:px-11">
            {tn("booking")}
          </Link>
        </div>
      </section>
    </div>
  );
}
