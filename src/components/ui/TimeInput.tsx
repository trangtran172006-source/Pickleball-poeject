"use client";

import { Clock } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/cn";
import { usePopover } from "./DatePicker";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function formatDisplay(hhmm: string, locale: string): string {
  const [hStr = "00", mStr = "00"] = hhmm.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const pad12 = String(h12).padStart(2, "0");
  const period = locale === "en" ? (h < 12 ? "AM" : "PM") : h < 12 ? "SA" : "CH";
  return `${pad12}:${mStr} ${period}`;
}

/**
 * B3: Locale-aware time picker so switching VI <-> EN updates SA/CH <-> AM/PM
 * instead of relying on the OS-locale browser <input type="time">.
 */
export function TimeInput({ id, value, onChange, invalid, className }: Props) {
  const locale = useLocale();
  const { open, setOpen, ref } = usePopover();
  const [curH = "05", curM = "00"] = (value || "05:00").split(":");

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15",
          invalid ? "border-danger" : "border-line",
        )}
      >
        <span>{formatDisplay(value, locale)}</span>
        <Clock aria-hidden className="size-4 shrink-0 text-body" strokeWidth={1.75} />
      </button>
      {open && (
        <div role="dialog" className="absolute left-0 top-full z-40 mt-1 flex w-48 gap-2 rounded-xl border border-line bg-white p-2.5 shadow-xl">
          <div className="max-h-48 flex-1 overflow-y-auto pr-1">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange(`${h}:${curM}`)}
                className={cn(
                  "flex w-full items-center justify-center rounded-md py-1 text-xs",
                  h === curH ? "bg-brand font-semibold text-white" : "text-ink hover:bg-page",
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-1 border-l border-line pl-2">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(`${curH}:${m}`);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-center rounded-md py-1.5 text-xs",
                  m === curM ? "bg-brand font-semibold text-white" : "text-ink hover:bg-page",
                )}
              >
                :{m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
