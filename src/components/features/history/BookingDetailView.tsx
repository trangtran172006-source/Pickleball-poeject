"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight, CalendarPlus, Check, ClipboardList, RotateCcw, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, PageTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge, BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { bookingStatusKey, paymentStatusKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { ApiError } from "@/services/api/client";
import { bookingsApi } from "@/services/api/customer";
import type { BookingDetail, HistoryEvent, SlotRef } from "@/shared/types";

const eventLook: Record<HistoryEvent["type"], { icon: typeof Check; ring: string }> = {
  create: { icon: CalendarPlus, ring: "bg-brand-soft text-brand" },
  paid: { icon: Check, ring: "bg-brand-soft text-brand" },
  reschedule: { icon: ArrowLeftRight, ring: "bg-brand-soft text-brand" },
  cancel: { icon: X, ring: "bg-danger-soft text-danger" },
  refund: { icon: RotateCcw, ring: "bg-warn-soft text-warn" },
  invalid: { icon: X, ring: "bg-danger-soft text-danger" },
};

type Props = { id: string; action?: ReactNode; extra?: (detail: BookingDetail) => ReactNode };

/** UI_12 / UI_32 – booking details, payment figures and the change timeline. */
export function BookingDetailView({ id, action, extra }: Props) {
  const t = useTranslations("history");
  const tc = useTranslations("common");
  const tb = useTranslations("booking");
  const te = useTranslations("errors");
  const ts = useTranslations("status");
  const f = useFormat();
  const detail = useQuery({ queryKey: ["booking", id], queryFn: () => bookingsApi.detail(id) });

  const slot = (ref: SlotRef) => `${ref.courtName} · ${f.date(ref.date)} · ${f.timeRange(ref.start, ref.end)}`;
  const titles: Record<HistoryEvent["type"], string> = { create: t("evCreate"), paid: t("evPaid"), reschedule: t("evMove"), cancel: t("evCancel"), refund: t("evRefund"), invalid: t("evInvalid") };
  const roles = { customer: t("roleCustomer"), staff: t("roleStaff"), owner: t("roleOwner"), system: t("bySystem") };

  return (
    <div>
      <PageTitle title={t("detailTitle")} subtitle={t("detailSub")} action={action} />
      {detail.isPending ? (
        <Card>
          <SkeletonRows rows={6} />
        </Card>
      ) : detail.isError ? (
        <Card>
          {detail.error instanceof ApiError && detail.error.status === 404 ? <EmptyState title={te("bookingNotFound")} /> : <ErrorState error={detail.error} onRetry={() => detail.refetch()} />}
        </Card>
      ) : (
        <div className="flex flex-col gap-5" data-detail={detail.data.code}>
          <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <ClipboardList aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-ink">{detail.data.code}</p>
              <p className="mt-1 text-xs text-muted">{t("bookedAt", { date: f.dateTime(detail.data.createdAt) })}</p>
            </div>
            <div className="flex gap-5">
              <div>
                <p className="mb-1.5 text-[10px] text-subtle">{t("bookingStatus")}</p>
                <BookingStatusBadge status={detail.data.status} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] text-subtle">{t("payStatus")}</p>
                <PaymentStatusBadge status={detail.data.paymentStatus} />
              </div>
            </div>
          </Card>
          {extra?.(detail.data)}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,370px)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <Card className="p-5 sm:p-6">
                <h2 className="text-base font-medium text-ink">{t("info")}</h2>
                <p className="mt-4 text-[10px] text-subtle">{tc("customer")}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{detail.data.booker.name}</p>
                <p className="mt-1.5 text-[11px] text-muted">{detail.data.booker.phone}</p>
                <div className="mt-5 border-t border-line pt-5">
                  <p className="text-[13px] font-semibold text-ink">{tc("appName")}</p>
                  <p className="mt-1.5 text-[11px] text-muted">{tc("address")}</p>
                </div>
                <dl className="mt-4 flex flex-col gap-4 text-xs">
                  {(
                    [
                      [tc("court"), detail.data.courtName],
                      [tb("playDate"), f.date(detail.data.date)],
                      [tb("slot"), f.timeRange(detail.data.start, detail.data.end)],
                      [tb("totalHours"), tc("hours", { count: detail.data.hours })],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-subtle">{label}</dt>
                      <dd className="font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                {detail.data.note && <p className="mt-4 rounded-lg bg-page px-3 py-2.5 text-[11px] text-muted">{detail.data.note}</p>}
              </Card>
              <Card className="p-5 sm:p-6">
                <h2 className="text-base font-medium text-ink">{t("payInfo")}</h2>
                <dl className="mt-4 flex flex-col gap-3.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-subtle">{t("bookingAmount")}</dt>
                    <dd className="font-semibold text-ink">{f.currency(detail.data.amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-subtle">{t("paid")}</dt>
                    <dd className="font-semibold text-ink">{f.currency(detail.data.paid)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-subtle">{t("refunded")}</dt>
                    <dd className="font-semibold text-brand">{f.currency(detail.data.refunded)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-3.5">
                    <dt className="text-subtle">{t("net")}</dt>
                    <dd className="font-semibold text-brand" data-net>{f.currency(detail.data.net)}</dd>
                  </div>
                </dl>
              </Card>
            </div>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-ink">{t("timeline")}</h2>
                <Badge tone="green" className="rounded-md py-1.5">{t("milestones", { count: detail.data.history.length })}</Badge>
              </div>
              <p className="mt-3 text-[11px] text-muted">{t("timelineSub")}</p>
              <ol className="mt-5 flex flex-col">
                {detail.data.history.map((event, index) => {
                  const look = eventLook[event.type];
                  const last = index === detail.data.history.length - 1;
                  return (
                    <li key={event.id} data-event={event.type} className="relative flex gap-3.5 pb-6 last:pb-0">
                      {!last && <span aria-hidden className="absolute bottom-0 left-[14px] top-8 w-px bg-line" />}
                      <span className={cn("relative flex size-[30px] shrink-0 items-center justify-center rounded-full", look.ring)}>
                        <look.icon aria-hidden className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-[13px] font-semibold text-ink">{titles[event.type]}</p>
                          <p className="text-[10px] text-subtle">{f.dateTime(event.at)}</p>
                        </div>
                        <p className="mt-1.5 text-[10px] text-subtle">
                          {event.actorName ? `${event.actorName} · ${roles[event.actorRole]}` : roles[event.actorRole]}
                        </p>
                        {event.type === "reschedule" && event.from && event.to ? (
                          <div className="mt-2.5 rounded-lg bg-page px-3.5 text-[11px]">
                            <p className="flex gap-4 border-b border-line py-2.5">
                              <span className="w-12 shrink-0 text-subtle">{t("oldSlot")}</span>
                              <span className="text-ink">{slot(event.from)}</span>
                            </p>
                            <p className="flex gap-4 py-2.5 font-medium text-brand">
                              <span className="w-12 shrink-0">{t("newSlot")}</span>
                              <span>{slot(event.to)}</span>
                            </p>
                          </div>
                        ) : (
                          event.to && <p className="mt-1.5 text-[11px] text-ink">{slot(event.to)}</p>
                        )}
                        {event.reason && <p className="mt-1.5 text-[11px] text-ink">{t("reason", { reason: event.reason })}</p>}
                        {(event.bookingStatus || event.paymentStatus || event.amount !== null) && (
                          <p className="mt-1.5 text-[10px] text-subtle">
                            {[
                              event.bookingStatus && ts(bookingStatusKey[event.bookingStatus]),
                              event.paymentStatus && ts(paymentStatusKey[event.paymentStatus]),
                              event.amount !== null && f.currency(event.amount),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
