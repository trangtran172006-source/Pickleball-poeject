"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Search } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useFormat } from "@/i18n/useFormat";
import { refundApi, type RefundListQuery } from "@/services/api/owner";

/** UI_51 – every booking, so the owner can open one and record a refund (UC_20.1). */
export function RefundList() {
  const t = useTranslations("refund");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const router = useRouter();
  const [draft, setDraft] = useState({ q: "", status: "" });
  const [filters, setFilters] = useState<RefundListQuery>({ page: 1 });
  const list = useQuery({ queryKey: ["refund-bookings", filters], queryFn: () => refundApi.list(filters), placeholderData: keepPreviousData });

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ q: draft.q.trim() || undefined, status: draft.status || undefined, page: 1 });
  };

  return (
    <div>
      <PageTitle title={t("listTitle")} subtitle={t("listSub")} />
      <form onSubmit={search} className="mb-5 grid items-center gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto]">
        <Input value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} />
        <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} aria-label={tc("status")}>
          <option value="">{tc("allStatuses")}</option>
          <option value="Chờ hoàn tiền">{ts("paymentRefundPending")}</option>
          <option value="Đã hoàn tiền">{ts("paymentRefunded")}</option>
          <option value="Đã thanh toán">{ts("paymentPaid")}</option>
        </Select>
        <Button type="submit" className="px-5" iconLeft={<Search aria-hidden className="size-4" />}>
          {tc("search")}
        </Button>
      </form>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <RotateCcw aria-hidden className="size-4 text-brand" strokeWidth={1.75} />
            <h2 className="text-[15px] font-medium text-ink">{t("tableTitle")}</h2>
          </div>
          {list.data && <span className="text-[11px] text-subtle">{t("count", { count: list.data.total })}</span>}
        </div>
        {list.isPending ? (
          <SkeletonRows rows={5} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-page text-[10px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colBooking")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colCustomer")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colSchedule")}</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">{t("colAmount")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colPayment")}</th>
                    <th scope="col" className="px-5 py-3 font-medium text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr key={item.id} data-booking={item.code} className="border-t border-line text-xs">
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-brand">{item.code}</span>
                        <span className="mt-1 block text-[10px] text-subtle">{f.dateTime(item.createdAt)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="block font-medium text-ink">{item.customerName}</span>
                        <span className="mt-0.5 block text-[10px] text-subtle">{item.customerPhone}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="block text-body">{item.courtName}</span>
                        <span className="mt-0.5 block text-[10px] text-subtle">{f.date(item.date)} · {item.start}–{item.end}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold text-ink">{f.currency(item.amount)}</td>
                      <td className="px-3 py-3.5"><PaymentStatusBadge status={item.refundStatus} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <button type="button" onClick={() => router.push(`/owner/refunds/${item.id}`)} data-open-booking className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                          {t("viewBooking")}
                          <ArrowRight aria-hidden className="size-3.5" />
                        </button>
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
    </div>
  );
}
