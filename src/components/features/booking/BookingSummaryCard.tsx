"use client";

import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { useFormat } from "@/i18n/useFormat";

export type Selection = { courtName: string; date: string; start: string; end: string; hours: number; total: number } | null;

/** Right-hand "Thông tin đặt sân" card that follows the user through the steps. */
export function BookingSummaryCard({ selection, footer }: { selection: Selection; footer?: ReactNode }) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const f = useFormat();
  const rows: Array<[string, string]> = [
    [t("courtType"), tc("standardCourt")],
    [t("selectedCourt"), selection?.courtName ?? t("notSelected")],
    [t("playDate"), selection ? f.date(selection.date) : "—"],
    [t("slot"), selection ? f.timeRange(selection.start, selection.end) : "—"],
    [t("totalHours"), selection ? tc("hours", { count: selection.hours }) : "—"],
  ];
  return (
    <Card className="p-6" data-summary>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium text-ink">{t("summary")}</h2>
        <ClipboardList aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
      </div>
      <p className="mt-5 text-sm font-medium text-ink">{tc("appName")}</p>
      <p className="mt-1.5 text-[11px] text-muted">{tc("address")}</p>
      <dl className="mt-5 flex flex-col gap-5 border-t border-line pt-5 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-subtle">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
        <span className="text-[13px] font-medium text-ink">{tc("total")}</span>
        <span className="text-2xl font-semibold text-brand" data-total>
          {f.currency(selection?.total ?? 0)}
        </span>
      </div>
      {footer}
    </Card>
  );
}
