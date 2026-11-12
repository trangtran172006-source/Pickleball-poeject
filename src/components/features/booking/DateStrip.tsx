"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/cn";
import { addDays, weekOf } from "@/lib/dates";
import { useFormat } from "@/i18n/useFormat";

type Props = { value: string; today: string; onChange: (iso: string) => void };

/** Month label with calendar popup, previous / today / next, and the week of day tiles. */
export function DateStrip({ value, today, onChange }: Props) {
  const t = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const arrow = "flex size-7 items-center justify-center rounded-md text-body hover:bg-page disabled:opacity-35";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <DatePicker
          value={value}
          min={today}
          onChange={(iso) => iso && onChange(iso)}
          trigger={(toggle, open) => (
            <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} data-month-trigger className="flex items-center gap-2.5 rounded-md py-1 pr-2 text-sm font-semibold text-ink hover:text-brand">
              <CalendarDays aria-hidden className="size-[18px] text-brand" strokeWidth={1.75} />
              {f.monthYear(value)}
            </button>
          )}
        />
        <div className="flex items-center gap-2 text-xs text-muted">
          <button type="button" className={arrow} disabled={value <= today} onClick={() => onChange(addDays(value, -1))} aria-label={t("prevPage")}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" className="rounded-md px-1.5 py-1 hover:text-brand" onClick={() => onChange(today)}>
            {t("today")}
          </button>
          <button type="button" className={arrow} onClick={() => onChange(addDays(value, 1))} aria-label={t("nextPage")}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {weekOf(value).map((iso) => {
          const past = iso < today;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              data-day={iso}
              aria-pressed={selected}
              aria-label={f.dateLong(iso)}
              onClick={() => onChange(iso)}
              className={cn(
                "flex h-[74px] min-w-0 flex-col items-center justify-center rounded-lg border px-0.5 text-center",
                selected ? "border-brand bg-brand text-white" : past ? "cursor-not-allowed border-line bg-page text-subtle" : "border-line bg-white text-ink hover:border-brand",
              )}
            >
              <span className={cn("w-full truncate text-[9px] sm:text-[10px]", !selected && "text-subtle")}>
                <span className="sm:hidden">{f.weekdayShort(iso)}</span>
                <span className="hidden sm:inline">{f.weekday(iso)}</span>
              </span>
              <span className="text-lg font-semibold leading-tight">{iso.slice(8, 10)}</span>
              <span className={cn("flex items-center gap-0.5 text-[8px] sm:text-[9px]", !selected && "text-subtle")}>
                {past ? (
                  <>
                    {ts("slotPast")} <Lock aria-hidden className="size-2.5 text-warn" />
                  </>
                ) : iso === today ? (
                  t("today")
                ) : (
                  `${+iso.slice(5, 7)}/${iso.slice(0, 4)}`
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
