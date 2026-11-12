"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = { page: number; pageSize: number; total: number; itemLabel: string; onChange: (page: number) => void };

/** "Showing 1–4 of 4 …" plus the < 1 > pager from the list frames. */
export function Pagination({ page, pageSize, total, itemLabel, onChange }: Props) {
  const t = useTranslations("common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const arrow = "flex size-7 items-center justify-center rounded-md text-body hover:bg-page disabled:opacity-35";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-muted">
      <span>{t("showing", { from, to, total, item: itemLabel })}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={arrow} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t("prevPage")}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <span className="flex size-7 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white" aria-current="page">
          {page}
        </span>
        <button type="button" className={arrow} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t("nextPage")}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
