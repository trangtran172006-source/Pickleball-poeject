"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { nowClock, todayISO, toMinutes } from "@/lib/dates";
import { useFormat } from "@/i18n/useFormat";
import { courtsApi } from "@/services/api/customer";
import type { Schedule, SlotState } from "@/shared/types";
import { BookingSummaryCard, type Selection } from "./BookingSummaryCard";
import { CourtGrid, type Range } from "./CourtGrid";
import { DateStrip } from "./DateStrip";
import type { StepProps } from "./types";
import { VenueCard } from "./VenueCard";

/** Selected range -> summary numbers. Returns null if any slot is no longer free. */
function describe(schedule: Schedule, range: Range): Selection {
  if (!range) return null;
  const court = schedule.courts.find((item) => item.id === range.courtId);
  if (!court) return null;
  const slots = court.slots.filter((slot) => toMinutes(slot.start) >= toMinutes(range.start) && toMinutes(slot.start) < toMinutes(range.end));
  if (slots.length === 0 || slots.some((slot) => slot.status !== "free")) return null;
  const minutes = toMinutes(range.end) - toMinutes(range.start);
  return { courtName: court.name, date: schedule.date, start: range.start, end: range.end, hours: minutes / 60, total: slots.reduce((sum, slot) => sum + slot.price, 0) };
}

/** Step 1 – choose the day and the time slots (UI_13 / UI_25). */
export function StepSchedule({ paths, state, update }: StepProps) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const f = useFormat();
  const toast = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  const date = state.date ?? todayISO();
  const schedule = useQuery({ queryKey: ["schedule", date], queryFn: () => courtsApi.schedule(date), refetchInterval: 20_000 });
  const data = schedule.data;
  const today = data?.today ?? todayISO();

  const defaultBand = data
    ? (date === today && data.bands.find((band) => nowClock() >= band.start && nowClock() < band.end)) || data.bands[0]
    : undefined;
  const band = data?.bands.find((item) => item.id === state.bandId) ?? defaultBand;
  const selection = data ? describe(data, state.range) : state.selection;

  // A slot picked earlier may have been taken by someone else since the last refresh.
  useEffect(() => {
    if (data && state.range && !describe(data, state.range)) {
      update({ range: null, selection: null });
      toast.show("error", te("slotTaken"));
    }
  }, [data, state.range, update, toast, te]);

  const pick = (courtId: string, start: string, end: string, status: SlotState) => {
    setProblem(null);
    if (status !== "free") return toast.show("error", te("slotTaken"));
    const current = state.range;
    let next: Range = { courtId, start, end };
    if (current && current.courtId === courtId) {
      if (start === current.end) next = { ...current, end };
      else if (end === current.start) next = { ...current, start };
      else if (start >= current.start && end <= current.end) {
        if (start === current.start && end === current.end) next = null;
        else if (start === current.start) next = { ...current, start: end };
        else next = { ...current, end: start };
      }
    }
    update({ range: next, selection: data && next ? describe(data, next) : null });
  };

  const goNext = () => {
    if (!data || !state.range || !selection) return setProblem(tv("slotRequired"));
    if (selection.hours * 60 < data.minMinutes) return setProblem(tv("minDuration", { minutes: data.minMinutes }));
    update({ step: 1, date, selection });
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="flex min-w-0 flex-col gap-5">
        <VenueCard
          action={
            <Link href={paths.pricing} className="shrink-0 text-[11px] font-medium text-brand underline underline-offset-2">
              {t("priceList")}
            </Link>
          }
        />
        <Card className="p-5">
          <DateStrip value={date} today={today} onChange={(iso) => update({ date: iso, range: null, selection: null, bandId: null })} />
          <div className="mt-5 border-t border-line pt-5">
            <h2 className="text-[13px] font-semibold text-ink">
              {t("schedule")} · {f.dateLong(date)}
            </h2>
            {schedule.isPending ? (
              <div role="status" className="mt-4 flex flex-col gap-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : schedule.isError ? (
              <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} className="px-0" />
            ) : !data || data.courts.length === 0 || !band ? (
              <EmptyState title={t("noCourts")} />
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {data.bands.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-band={item.id}
                      aria-pressed={item.id === band.id}
                      onClick={() => update({ bandId: item.id })}
                      className={cn("h-8 rounded-md text-[11px]", item.id === band.id ? "bg-brand-soft font-semibold text-brand" : "bg-page text-muted hover:text-ink")}
                    >
                      {item.start} – {item.end}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <CourtGrid schedule={data} band={band} range={state.range} onPick={pick} />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <BookingSummaryCard selection={selection} />
        {problem && (
          <p role="alert" className="text-xs text-danger">
            {problem}
          </p>
        )}
        <Button size="lg" fullWidth className="h-[46px] text-sm" onClick={goNext} iconRight={<ArrowRight aria-hidden className="size-4" />} data-next>
          {tc("next")}
        </Button>
      </div>
    </div>
  );
}
