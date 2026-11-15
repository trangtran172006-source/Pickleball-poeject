"use client";

import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { useFormat } from "@/i18n/useFormat";

export type SelectionItem = { courtName: string; date: string; start: string; end: string; hours: number; total: number };
export type Selection = SelectionItem | null;

/** Right-hand "Thông tin đặt sân" card. Hỗ trợ chọn nhiều sân cùng lúc (A3). */
export function BookingSummaryCard({ selections, footer }: { selections: SelectionItem[]; footer?: ReactNode }) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const f = useFormat();
  const grandTotal = selections.reduce((sum, s) => sum + s.total, 0);

  return (
    <Card className="p-6" data-summary>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium text-ink">{t("summary")}</h2>
        <ClipboardList aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
      </div>
      <p className="mt-5 text-sm font-medium text-ink">{tc("appName")}</p>
      <p className="mt-1.5 text-[11px] text-muted">{tc("address")}</p>

      <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-subtle">{t("courtType")}</dt>
          <dd className="text-right font-medium text-ink">{tc("standardCourt")}</dd>
        </div>
        {selections.length === 0 ? (
          <p className="text-[13px] text-subtle">{t("notSelected")}</p>
        ) : (
          selections.map((sel, index) => (
            <div key={`${sel.courtName}-${index}`} className="flex flex-col gap-2.5 rounded-lg bg-page px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-ink">{sel.courtName}</span>
                {selections.length > 1 && <span className="text-xs font-semibold text-brand">{f.currency(sel.total)}</span>}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                <span>{f.date(sel.date)}</span>
                <span className="font-medium text-ink">{f.timeRange(sel.start, sel.end)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                <span>{t("totalHours")}</span>
                <span className="font-medium text-ink">{tc("hours", { count: sel.hours })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
        <span className="text-[13px] font-medium text-ink">{tc("total")}</span>
        <span className="text-2xl font-semibold text-brand" data-total>
          {f.currency(grandTotal)}
        </span>
      </div>
      {footer}
    </Card>
  );
}
