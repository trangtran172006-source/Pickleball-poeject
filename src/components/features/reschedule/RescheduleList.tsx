"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
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
import { Badge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { closureReasonKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { rescheduleApi, staffApi, type AffectedFilters } from "@/services/api/staff";

/** UI_34 – bookings affected by a court closure, waiting to be moved (UC_4.1). */
export function RescheduleList({ base }: { base: string }) {
  const t = useTranslations("reschedule");
  const th = useTranslations("history");
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const [draft, setDraft] = useState<{ q: string; date: string | null; courtId: string }>({ q: "", date: null, courtId: "" });
  const [filters, setFilters] = useState<AffectedFilters>({ page: 1 });
  const courts = useQuery({ queryKey: ["courts"], queryFn: staffApi.courts, staleTime: 300_000 });
  const list = useQuery({ queryKey: ["affected", filters], queryFn: () => rescheduleApi.affected(filters), placeholderData: keepPreviousData });

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ q: draft.q.trim() || undefined, date: draft.date, courtId: draft.courtId || undefined, page: 1 });
  };

  return (
    <div>
      <PageTitle title={t("title")} />
      <Card className="p-5">
        <h2 className="text-[13px] font-semibold text-ink">{t("findTitle")}</h2>
        <form onSubmit={search} className="mt-3.5 grid items-end gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label={th("codeOrCustomer")} htmlFor="q">
            <Input id="q" maxLength={100} value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder={t("keywordPlaceholder")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} />
          </Field>
          <Field label={tb("playDate")} htmlFor="date">
            <DatePicker id="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} placeholder={tc("allTime")} clearable />
          </Field>
          <Field label={t("affectedCourt")} htmlFor="courtId">
            <Select id="courtId" value={draft.courtId} onChange={(event) => setDraft({ ...draft, courtId: event.target.value })}>
              <option value="">{tc("allCourts")}</option>
              {(courts.data ?? []).map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" className="px-5" iconLeft={<Search aria-hidden className="size-4" />}>
            {tc("search")}
          </Button>
        </form>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="flex items-center gap-3 text-[15px] font-medium text-ink">
            {t("listTitle")}
            {list.data && <Badge tone="green">{t("count", { count: list.data.total })}</Badge>}
          </h2>
          <p className="flex items-center gap-2 text-[11px] text-subtle">
            <Clock aria-hidden className="size-3.5" strokeWidth={1.75} />
            {t("sortNearest")}
          </p>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={3} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-page text-[10px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{th("codeLabel")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("customer")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("court")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{th("colPlay")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colReason")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{th("colPayment")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr key={item.id} data-affected={item.code} className="border-t border-line text-[11px]">
                      <td className="px-5 py-4">
                        <span className="block font-semibold text-ink">{item.code}</span>
                        <span className="mt-1 block text-[10px] text-warn">{t("needAction")}</span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="block font-medium text-ink">{item.customerName}</span>
                        <span className="mt-1 block text-[10px] text-subtle">{item.customerPhone}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-ink">{item.courtName}</td>
                      <td className="px-3 py-4">
                        <span className="block font-medium text-ink">{f.date(item.date)}</span>
                        <span className="mt-1 block text-[10px] text-subtle">{f.timeRange(item.start, item.end)}</span>
                      </td>
                      <td className="px-3 py-4">{item.affectedReason && <Badge tone="amber">{ts(closureReasonKey[item.affectedReason])}</Badge>}</td>
                      <td className="px-3 py-4">
                        <PaymentStatusBadge status={item.paymentStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`${base}/reschedule/${item.id}`} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-3 text-[11px] font-semibold text-white hover:bg-brand-dark">
                          {t("action")}
                          <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line">
              <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} itemLabel={th("item")} onChange={(page) => setFilters({ ...filters, page })} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
