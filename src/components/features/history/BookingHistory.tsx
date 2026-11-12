"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Info, Search } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge, BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { bookingStatusKey, type BookingStatus } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { bookingsApi, type BookingFilters } from "@/services/api/customer";
import type { BookingSummary } from "@/shared/types";
import { CancelDialog } from "./CancelDialog";

type Props = {
  /** customer: own bookings + cancel button; staff: all customers, phone search, detail link. */
  variant: "customer" | "staff";
  /** Detail pages live at `${detailBase}/<id>`. */
  detailBase: string;
  backHref?: string;
};

/** UI_10 (customer) and UI_31 (staff / owner) – booking history with search (UC_2.3). */
export function BookingHistory({ variant, detailBase, backHref }: Props) {
  const detailHref = (id: string) => `${detailBase}/${id}`;
  const t = useTranslations("history");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const ts = useTranslations("status");
  const f = useFormat();
  const staff = variant === "staff";
  const [draft, setDraft] = useState<{ q: string; date: string | null; status: string }>({ q: "", date: null, status: "" });
  const [filters, setFilters] = useState<BookingFilters>({ page: 1 });
  const [cancelling, setCancelling] = useState<BookingSummary | null>(null);
  const list = useQuery({ queryKey: ["bookings", variant, filters], queryFn: () => bookingsApi.list(filters), placeholderData: keepPreviousData });
  const filtered = !!(filters.q || filters.date || filters.status);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ q: draft.q.trim() || undefined, date: draft.date, status: draft.status || undefined, page: 1 });
  };

  return (
    <div>
      <PageTitle
        title={staff ? t("staffTitle") : t("title")}
        subtitle={staff ? t("staffSubtitle") : t("subtitle")}
        action={
          backHref && (
            <Link href={backHref} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-xs font-semibold text-brand hover:bg-page">
              ← {tn("bookingManagement")}
            </Link>
          )
        }
      />
      {staff && (
        <p className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-soft px-4 py-2.5 text-xs text-brand">
          <span className="flex items-center gap-2">
            <Info aria-hidden className="size-4" strokeWidth={1.75} />
            {t("staffNote")}
          </span>
          <span className="font-medium">{t("staffOwner")}</span>
        </p>
      )}

      <Card className="p-5">
        <h2 className="text-[13px] font-semibold text-ink">{t("searchTitle")}</h2>
        <form onSubmit={search} className="mt-3.5 grid items-end gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label={staff ? t("codeOrCustomer") : t("codeLabel")} htmlFor="q">
            <Input id="q" maxLength={50} value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder={staff ? t("codeOrPhonePlaceholder") : t("codePlaceholder")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} />
          </Field>
          <Field label={t("bookedDate")} htmlFor="date">
            <DatePicker id="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} placeholder={tc("allTime")} clearable />
          </Field>
          <Field label={t("bookingStatus")} htmlFor="status">
            <Select id="status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option value="">{tc("allStatuses")}</option>
              {(Object.keys(bookingStatusKey) as BookingStatus[]).map((status) => (
                <option key={status} value={status}>
                  {ts(bookingStatusKey[status])}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" className="px-5" iconLeft={<Search aria-hidden className="size-4" />}>
            {tc("lookup")}
          </Button>
        </form>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          {staff && <h2 className="text-[15px] font-medium text-ink">{t("allBookings")}</h2>}
          <p className="flex items-center gap-2 text-[11px] text-subtle">
            <Clock aria-hidden className="size-3.5" strokeWidth={1.75} />
            {t("sortNewest")}
          </p>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={filtered ? t("noMatch") : t("empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-page text-[10px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colCode")}</th>
                    {staff && <th scope="col" className="px-3 py-3 font-medium">{tc("customer")}</th>}
                    <th scope="col" className="px-3 py-3 font-medium">{tc("court")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colPlay")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colStatus")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colPayment")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("amount")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{staff ? tc("viewDetail") : tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr key={item.id} data-booking={item.code} className="border-t border-line align-middle">
                      <td className="px-5 py-3.5">
                        <Link href={detailHref(item.id)} className="block text-[11px] font-semibold text-ink hover:text-brand">
                          {item.code}
                        </Link>
                        <span className="mt-1 block text-[10px] text-subtle">{f.dateTime(item.createdAt)}</span>
                      </td>
                      {staff && (
                        <td className="px-3 py-3.5">
                          <span className="block text-[11px] font-medium text-ink">{item.customerName}</span>
                          <span className="mt-1 block text-[10px] text-subtle">{item.customerPhone}</span>
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-3.5 text-[11px] font-medium text-ink">{item.courtName}</td>
                      <td className="px-3 py-3.5">
                        <span className="block text-[11px] font-medium text-ink">{f.date(item.date)}</span>
                        <span className="mt-1 block text-[10px] text-subtle">{f.timeRange(item.start, item.end)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <BookingStatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <PaymentStatusBadge status={item.paymentStatus} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className="block text-xs font-semibold text-ink">{f.currency(item.amount)}</span>
                        {item.paymentStatus === "Đã hoàn tiền" && <span className="mt-1 block text-[9px] text-subtle">{t("refundedAll")}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {staff ? (
                          <Link href={detailHref(item.id)} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-brand hover:underline">
                            {tc("viewDetail")}
                            <ChevronRight aria-hidden className="size-3.5" />
                          </Link>
                        ) : item.canCancel ? (
                          <button type="button" data-cancel onClick={() => setCancelling(item)} className="whitespace-nowrap rounded-full border border-danger-line bg-danger-soft px-2.5 py-1 text-[10px] font-semibold text-danger hover:bg-danger-line/40">
                            {t("cancelBooking")}
                          </button>
                        ) : (
                          <Badge tone="gray" className="invisible">–</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line">
              <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} itemLabel={t("item")} onChange={(page) => setFilters({ ...filters, page })} />
            </div>
          </>
        )}
      </Card>
      {cancelling && <CancelDialog booking={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}
