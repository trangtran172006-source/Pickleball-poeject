"use client";

import { useState } from "react";
import { FileBarChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { todayISO } from "@/lib/dates";
import { useFormat } from "@/i18n/useFormat";
import { reportsApi, type ReportQuery } from "@/services/api/owner";
import type { CourtReport, ProductReport, ReportPeriod } from "@/shared/types";

type Kind = "court" | "products";

/** UI_40 (court rental) and UI_39 (products & services) revenue reports (UC_5.1 / UC_5.2). */
export function ReportView({ kind }: { kind: Kind }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [date, setDate] = useState<string>(todayISO());
  const [range, setRange] = useState<{ from: string; to: string }>({ from: todayISO(), to: todayISO() });
  const [query, setQuery] = useState<ReportQuery>({ period: "day", date: todayISO() });
  const report = useQuery({
    queryKey: ["report", kind, query],
    queryFn: (): Promise<CourtReport | ProductReport> => (kind === "court" ? reportsApi.court(query) : reportsApi.products(query)),
  });

  const run = () => setQuery(period === "range" ? { period, from: range.from, to: range.to } : { period, date });
  const periods: Array<[ReportPeriod, string]> = [
    ["day", t("byDay")],
    ["week", t("byWeek")],
    ["month", t("byMonth")],
    ["year", t("byYear")],
    ["range", t("byRange")],
  ];

  return (
    <div>
      <PageTitle title={kind === "court" ? t("courtTitle") : t("productsTitle")} />
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("periodType")} htmlFor="period" className="w-full sm:w-44">
            <Select id="period" value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)}>
              {periods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {period === "range" ? (
            <>
              <Field label={t("fromDate")} htmlFor="from" className="w-full sm:w-44">
                <DatePicker id="from" value={range.from} max={range.to} onChange={(value) => value && setRange({ ...range, from: value })} />
              </Field>
              <Field label={t("toDate")} htmlFor="to" className="w-full sm:w-44">
                <DatePicker id="to" value={range.to} min={range.from} onChange={(value) => value && setRange({ ...range, to: value })} />
              </Field>
            </>
          ) : (
            <Field label={t("reportDate")} htmlFor="date" className="w-full sm:w-52">
              <DatePicker id="date" value={date} onChange={(value) => value && setDate(value)} />
            </Field>
          )}
          <Button className="px-5" onClick={run} iconLeft={<FileBarChart aria-hidden className="size-4" />}>
            {t("view")}
          </Button>
          <span className="ml-auto self-center text-[11px] text-subtle">{tc("unitVnd")}</span>
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {report.isPending ? (
          <SkeletonRows rows={5} />
        ) : report.isError ? (
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        ) : kind === "court" ? (
          <CourtResult report={report.data as CourtReport} />
        ) : (
          <ProductResult report={report.data as ProductReport} />
        )}
      </Card>
    </div>
  );
}

function CourtResult({ report }: { report: CourtReport }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const f = useFormat();
  const hours = Math.floor(report.totalMinutes / 60);
  const mins = report.totalMinutes % 60;
  if (report.rows.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium text-ink">{t("bookingDetail")}</h2>
          <p className="mt-1 text-[11px] text-subtle">{t("period", { period: report.periodLabel })}</p>
        </div>
        <span className="text-[11px] text-subtle">{t("bookingsN", { count: report.rows.length })}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-page text-[10px] text-subtle">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">{t("colCode")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("colDateTime")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{tc("court")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("colDuration")}</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">{t("colTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.code} className="border-t border-line">
                <td className="px-5 py-3.5 font-semibold text-brand">{row.code}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-body">
                  {f.date(row.date)} · {f.timeRange(row.start, row.end)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-ink">{row.courtName}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-body">{tc("minutes", { count: row.minutes })}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink">{f.number(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResultFooter
        periodLabel={report.periodLabel}
        note={`${t("totalDuration")}: ${t("durationFull", { minutes: report.totalMinutes, hours, mins })}`}
        totalLabel={t("totalCourt")}
        total={f.currency(report.total)}
        extra={report.refunds > 0 ? `${t("refundsInPeriod")}: −${f.currency(report.refunds)}` : undefined}
      />
    </>
  );
}

function ProductResult({ report }: { report: ProductReport }) {
  const t = useTranslations("reports");
  const tp = useTranslations("pos");
  const f = useFormat();
  if (report.rows.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium text-ink">{t("itemDetail")}</h2>
          <p className="mt-1 text-[11px] text-subtle">{t("period", { period: report.periodLabel })}</p>
        </div>
        <span className="text-[11px] text-subtle">{t("rowsN", { count: report.rows.length })}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-page text-[10px] text-subtle">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">{t("colItem")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{tp("colPrice")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("colOrderTime")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("colQty")}</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">{tp("colLine")}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-t border-line">
                <td className="px-5 py-3.5 font-medium text-ink">{row.name}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-body">{f.currency(row.unitPrice)}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-body">{f.dateTime(row.orderedAt)}</td>
                <td className="px-3 py-3.5 text-ink">{row.quantity}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink">{f.currency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResultFooter
        periodLabel={report.periodLabel}
        note={`${t("totalGoodsQty", { count: report.totalGoodsQty })} · ${t("totalServiceQty", { count: report.totalServiceQty })}`}
        totalLabel={t("totalProducts")}
        total={f.currency(report.total)}
      />
    </>
  );
}

function ResultFooter({ periodLabel, note, totalLabel, total, extra }: { periodLabel: string; note: string; totalLabel: string; total: string; extra?: string }) {
  const t = useTranslations("reports");
  return (
    <div className="border-t border-line bg-page/50 px-5 py-5">
      <h3 className="text-[13px] font-semibold text-ink">{t("result")}</h3>
      <p className="mt-1 text-[11px] text-subtle">{t("period", { period: periodLabel })}</p>
      <p className="mt-3 text-xs text-body">{note}</p>
      {extra && <p className="mt-1 text-xs text-warn">{extra}</p>}
      <div className="mt-4 rounded-lg bg-brand-soft px-5 py-4">
        <p className="text-xs text-brand">{totalLabel}</p>
        <p className="mt-1 text-2xl font-semibold text-brand" data-total>
          {total}
        </p>
      </div>
    </div>
  );
}
