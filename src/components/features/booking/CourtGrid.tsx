"use client";

import { Check, Lock, Plus, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { toMinutes } from "@/lib/dates";
import type { PriceBand, Schedule, SlotState } from "@/shared/types";

export type Range = { courtId: string; start: string; end: string } | null;

type Props = {
  schedule: Schedule;
  band: PriceBand;
  range: Range;
  onPick: (courtId: string, start: string, end: string, status: SlotState) => void;
};

const look: Record<SlotState | "selected", string> = {
  free: "border-line bg-white text-brand hover:border-brand",
  booked: "border-transparent bg-[#dfe5e1] text-subtle",
  past: "border-transparent bg-[#eef1ee] text-subtle/70",
  maintenance: "border-transparent bg-[#fdf1df] text-[#b7791f]",
  selected: "border-brand bg-brand text-white",
};

/** Courts × 30-minute slots for the chosen price band (UC_2.1 step 3). */
export function CourtGrid({ schedule, band, range, onPick }: Props) {
  const t = useTranslations("booking");
  const ts = useTranslations("status");
  const from = toMinutes(band.start);
  const to = toMinutes(band.end);
  const inBand = (start: string) => toMinutes(start) >= from && toMinutes(start) < to;
  const columns = schedule.courts[0]?.slots.filter((slot) => inBand(slot.start)) ?? [];
  const isSelected = (courtId: string, start: string) =>
    !!range && range.courtId === courtId && toMinutes(start) >= toMinutes(range.start) && toMinutes(start) < toMinutes(range.end);
  const labels = { free: ts("slotFree"), booked: ts("slotBooked"), maintenance: ts("slotMaintenance"), past: ts("slotPast"), selected: ts("slotSelected") };
  const icons = { free: Plus, booked: Lock, past: Lock, maintenance: Wrench, selected: Check };

  return (
    <div>
      <div className="overflow-x-auto pb-2" data-grid>
        <table className="border-separate border-spacing-x-1 border-spacing-y-2.5">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-[64px] bg-white pr-2 text-left align-middle text-[10px] font-normal text-subtle">
                {t("courtTime")}
              </th>
              {columns.map((slot) => (
                <th key={slot.start} scope="col" className="min-w-[56px] pb-1 text-center font-normal">
                  <span className="block text-[10px] font-medium text-ink">{slot.start}</span>
                  <span className="block text-[9px] text-subtle">{slot.end}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.courts.map((court) => (
              <tr key={court.id}>
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white pr-2 text-left text-xs font-semibold text-ink">
                  {court.name}
                </th>
                {court.slots
                  .filter((slot) => inBand(slot.start))
                  .map((slot) => {
                    const state = isSelected(court.id, slot.start) ? "selected" : slot.status;
                    const Icon = icons[state];
                    return (
                      <td key={slot.start} className="p-0">
                        <button
                          type="button"
                          data-slot={`${court.id}|${slot.start}`}
                          data-state={state}
                          aria-pressed={state === "selected"}
                          aria-disabled={slot.status !== "free"}
                          aria-label={`${court.name} ${slot.start}–${slot.end} ${labels[state]}`}
                          onClick={() => onPick(court.id, slot.start, slot.end, slot.status)}
                          className={cn("flex h-[56px] w-[56px] flex-col items-center justify-center gap-1 rounded-md border", look[state], slot.status !== "free" && "cursor-not-allowed")}
                        >
                          <Icon aria-hidden className="size-3.5" strokeWidth={2} />
                          <span className="text-[8px] leading-none">{labels[state]}</span>
                        </button>
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted">
        {(
          [
            ["free", "border border-line bg-white"],
            ["booked", "bg-[#dfe5e1]"],
            ["maintenance", "bg-[#fdf1df]"],
            ["selected", "bg-brand"],
          ] as const
        ).map(([key, box]) => (
          <li key={key} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-3 rounded-[3px]", box)} />
            {labels[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
