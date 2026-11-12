"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { addDays, addMonths, daysInMonth, todayISO, weekdayIndex } from "@/lib/dates";
import { defaultLocale, intlTags, isLocale } from "@/i18n/config";
import { useFormat } from "@/i18n/useFormat";

type CalendarProps = { value: string | null; onSelect: (iso: string) => void; min?: string; max?: string };

/** Month grid. Days outside [min, max] are shown but cannot be chosen. */
export function Calendar({ value, onSelect, min, max }: CalendarProps) {
  const t = useTranslations("common");
  const f = useFormat();
  const locale = useLocale();
  const tag = intlTags[isLocale(locale) ? locale : defaultLocale];
  const today = todayISO();
  const [month, setMonth] = useState(() => `${(value ?? today).slice(0, 7)}-01`);
  const lead = weekdayIndex(month);
  const count = daysInMonth(month);
  const names = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + index))),
  );
  const nav = "flex size-7 items-center justify-center rounded-md text-body hover:bg-page";

  return (
    <div className="w-[264px] p-3" data-calendar>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={nav} onClick={() => setMonth(addMonths(month, -1))} aria-label={t("prevPage")}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <span className="text-[13px] font-semibold text-ink">{f.monthYear(month)}</span>
        <button type="button" className={nav} onClick={() => setMonth(addMonths(month, 1))} aria-label={t("nextPage")}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {names.map((name) => (
          <span key={name} className="py-1 text-[10px] font-medium uppercase text-subtle">
            {name}
          </span>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <span key={`lead-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const iso = addDays(month, index);
          const disabled = (min !== undefined && iso < min) || (max !== undefined && iso > max);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              data-date={iso}
              aria-pressed={selected}
              aria-label={f.dateLong(iso)}
              onClick={() => onSelect(iso)}
              className={cn(
                "mx-auto flex size-8 items-center justify-center rounded-full text-xs",
                selected ? "bg-brand font-semibold text-white" : "text-ink hover:bg-brand-soft",
                iso === today && !selected && "font-semibold text-brand ring-1 ring-brand/40",
                disabled && "cursor-not-allowed text-subtle/50 hover:bg-transparent",
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 border-t border-line pt-2 text-center">
        <button
          type="button"
          className="text-xs font-semibold text-brand hover:underline disabled:opacity-40"
          disabled={(min !== undefined && today < min) || (max !== undefined && today > max)}
          onClick={() => onSelect(today)}
        >
          {t("today")}
        </button>
      </div>
    </div>
  );
}

/** Closes a popover when the user clicks outside it or presses Escape. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

type PickerProps = {
  id?: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  invalid?: boolean;
  align?: "left" | "right";
  className?: string;
  /** Replaces the default field-like trigger (used by the booking date strip). */
  trigger?: (toggle: () => void, open: boolean) => ReactNode;
};

/** Field that opens a calendar popup when the field or its calendar icon is pressed. */
export function DatePicker({ id, value, onChange, placeholder, min, max, clearable, invalid, align = "left", className, trigger }: PickerProps) {
  const t = useTranslations("common");
  const f = useFormat();
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger ? (
        trigger(() => setOpen((value) => !value), open)
      ) : (
        <button
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15",
            invalid ? "border-danger" : "border-line",
            value ? "text-ink" : "text-subtle/80",
          )}
        >
          <span className="truncate">{value ? f.date(value) : placeholder}</span>
          <CalendarDays aria-hidden className="size-4 shrink-0 text-body" strokeWidth={1.75} />
        </button>
      )}
      {open && (
        <div role="dialog" className={cn("absolute top-full z-40 mt-1 rounded-xl border border-line bg-white shadow-xl", align === "right" ? "right-0" : "left-0")}>
          <Calendar
            value={value}
            min={min}
            max={max}
            onSelect={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
          {clearable && value && (
            <div className="border-t border-line p-2 text-center">
              <button
                type="button"
                className="text-xs font-medium text-muted hover:text-ink"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                {placeholder ?? t("allTime")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
