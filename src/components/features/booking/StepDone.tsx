"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleCheck, Clock, Copy, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge, BookingStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/useFormat";
import { courtsApi } from "@/services/api/customer";
import { BookingSummaryCard } from "./BookingSummaryCard";
import type { StepProps } from "./types";
import { VenueCard } from "./VenueCard";

/** Step 4 – booking completed (UI_16 / UI_30). */
export function StepDone({ paths, state }: StepProps) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const tp = useTranslations("payment");
  const f = useFormat();
  const toast = useToast();
  const settings = useQuery({ queryKey: ["settings"], queryFn: courtsApi.settings, staleTime: 300_000 });
  const done = state.done!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(done.code);
      toast.show("success", tc("copied"));
    } catch {
      /* clipboard not available */
    }
  };
  const rows: Array<[string, string]> = [
    [t("booker"), done.booker.name],
    [t("phoneShort"), done.booker.phone],
    ...(done.booker.email ? ([[t("contactEmail"), done.booker.email]] as Array<[string, string]>) : []),
    [t("method"), tp("bankTransfer")],
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="flex min-w-0 flex-col gap-5">
        <VenueCard
          action={
            settings.data?.mapUrl ? (
              <a href={settings.data.mapUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-medium text-brand hover:underline">
                {t("viewMap")}
              </a>
            ) : undefined
          }
        />
        <Card className="px-5 py-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CircleCheck aria-hidden className="size-7" strokeWidth={1.5} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand" data-success>
            {t("success")}
          </h2>
          <p className="mt-3 text-xs text-muted">
            {t("thanks", { name: done.booker.name })}
            <br />
            {t("seeYou", { date: f.date(done.date) })}
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-3 rounded-lg bg-page px-5 py-2.5 text-[11px] text-subtle">
            {t("code")}
            <span className="text-base font-semibold text-brand" data-code>
              {done.code}
            </span>
            <button type="button" onClick={copy} aria-label={tc("copy")} className="text-brand">
              <Copy aria-hidden className="size-4" />
            </button>
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-medium text-ink">{t("confirmDetail")}</h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">
              {done.courtName} · {tc("standardCourt")}
            </span>
            <BookingStatusBadge status={done.status} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-page px-4 py-3">
              <CalendarDays aria-hidden className="size-4 text-subtle" strokeWidth={1.5} />
              <div>
                <p className="text-[10px] text-subtle">{t("playDate")}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">{f.date(done.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-page px-4 py-3">
              <Clock aria-hidden className="size-4 text-subtle" strokeWidth={1.5} />
              <div>
                <p className="text-[10px] text-subtle">
                  {t("slot")} · {tc("hours", { count: done.hours })}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">{f.timeRange(done.start, done.end)}</p>
              </div>
            </div>
          </div>
          <dl className="mt-5 flex flex-col gap-4 border-t border-line pt-5 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-subtle">{label}</dt>
                <dd className="text-right font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <p className="flex items-start gap-2.5 rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand">
          <Info aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
          <span>
            {t("confirmNotice")} {t("arriveNotice")} <span className="opacity-80">{tp("byProof")}</span>
          </span>
        </p>
        <div className="flex flex-wrap justify-between gap-3">
          <Link href={paths.home} className="inline-flex h-[46px] items-center gap-2 rounded-lg border border-line bg-white px-5 text-[13px] font-semibold text-ink hover:bg-page">
            <ArrowLeft aria-hidden className="size-4 text-subtle" />
            {t("goHome")}
          </Link>
          <Link href={paths.bookings} className="inline-flex h-[46px] items-center gap-2 rounded-lg bg-brand px-6 text-[13px] font-semibold text-white hover:bg-brand-dark">
            {t("viewBookings")}
            <CalendarDays aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
      <BookingSummaryCard
        selection={{ courtName: done.courtName, date: done.date, start: done.start, end: done.end, hours: done.hours, total: done.amount }}
        footer={
          <Badge tone="green" className="mt-4 rounded-md px-2.5 py-1.5">
            {t("paidBadge", { amount: f.currency(done.paid) })}
          </Badge>
        }
      />
    </div>
  );
}
