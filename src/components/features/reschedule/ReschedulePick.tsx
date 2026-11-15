"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, CalendarCheck, Check, CircleCheck, History, Info, Lock, LockOpen, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { paymentStatusKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { ApiError } from "@/services/api/client";
import { rescheduleApi } from "@/services/api/staff";
import type { RescheduleOption, RescheduleResult, SlotRef } from "@/shared/types";

/** UI_35 → UI_36 → UI_37: choose the replacement slot, confirm, show the result. */
export function ReschedulePick({ base, id }: { base: string; id: string }) {
  const t = useTranslations("reschedule");
  const tb = useTranslations("booking");
  const th = useTranslations("history");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const [target, setTarget] = useState<{ courtId?: string; date?: string }>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<RescheduleResult | null>(null);
  const options = useQuery({
    queryKey: ["reschedule-options", id, target],
    queryFn: () => rescheduleApi.options(id, target.courtId, target.date),
    enabled: !result,
    placeholderData: (previous) => previous,
  });
  const data = options.data;
  const choice = data?.options.find((option) => option.start === picked && option.state === "ok") ?? null;
  const hours = data ? tc("hours", { count: data.booking.hours }) : "";
  const courtName = data?.courts.find((court) => court.id === data.courtId)?.name ?? "";
  const paid = data ? ts(paymentStatusKey[data.booking.paymentStatus]) : "";

  const move = useMutation({
    mutationFn: () => rescheduleApi.confirm(id, { courtId: data!.courtId, date: data!.date, start: choice!.start, end: choice!.end }),
    onSuccess: (done) => {
      setConfirming(false);
      setResult(done);
      void client.invalidateQueries({ queryKey: ["affected"] });
      void client.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (error) => {
      setConfirming(false);
      setPicked(null);
      toast.show("error", errorText(error, "errors.slotInvalid")); // UC_4.1 5a
      void options.refetch();
    },
  });

  const slot = (ref: SlotRef) => `${ref.courtName} · ${f.date(ref.date)} · ${f.timeRange(ref.start, ref.end)}`;
  const back = (
    <Link href={`${base}/reschedule`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-brand hover:bg-page">
      <ArrowLeft aria-hidden className="size-4" />
      {t("backToList")}
    </Link>
  );
  const stateText: Record<RescheduleOption["state"], string> = { ok: t("optOk"), price: t("optPrice"), booked: t("optBooked"), closed: t("optClosed"), past: t("optBooked") };

  if (result) {
    const sameDateSlot = result.from.date === result.to.date && result.from.start === result.to.start && result.from.end === result.to.end;
    const steps = [
      {
        icon: LockOpen,
        title: t("done1"),
        detail: t("done1Desc", { slot: slot(result.from) }),
      },
      {
        icon: Lock,
        title: t("done2"),
        detail: t("done2Desc", { slot: slot(result.to), code: result.booking.code }),
      },
      {
        icon: Send,
        title: t("done3"),
        detail: t("done3Desc", { name: result.booking.customerName }),
      },
      {
        icon: History,
        title: t("done4"),
        detail: t("done4Desc", { actor: result.actorName, at: f.dateTime(result.at), reason: result.reason || "-" }),
      },
    ];
    return (
      <div data-reschedule-done>
        <PageTitle title={t("title")} subtitle={t("doneSub")} />
        <div role="status" className="mb-5 flex items-center gap-3.5 rounded-lg border border-brand bg-brand-soft px-5 py-4 text-brand">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check aria-hidden className="size-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium leading-tight text-ink">{t("success")}</p>
            <p className="mt-1 text-xs text-brand">{t("successDesc", { code: result.booking.code })}</p>
          </div>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium text-ink">{t("newBooking")}</h2>
              <BookingStatusBadge status={result.booking.status} />
            </div>
            <p className="mt-4 text-[10px] text-subtle">{tc("customer")}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{result.booking.customerName}</p>
            <p className="mt-1.5 text-[11px] text-muted">
              {result.booking.code} · {result.booking.customerPhone}
            </p>
            <dl className="mt-5 flex flex-col gap-3.5 border-t border-line pt-5 text-xs">
              {(
                [
                  [t("newCourt"), result.to.courtName],
                  [tb("playDate"), f.date(result.to.date)],
                  [tb("slot"), `${f.timeRange(result.to.start, result.to.end)} · ${tc("hours", { count: result.booking.hours })}`],
                  [t("newPrice"), t("perHour", { amount: f.currency(result.pricePerHour) })],
                  [t("totalAmount"), f.currency(result.booking.amount)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                  <dt className="text-subtle">{label}</dt>
                  <dd className="font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-2 text-[10px] text-subtle">{th("payStatus")}</p>
              <PaymentStatusBadge status={result.booking.paymentStatus} />
              <span className="ml-2 text-[10px] text-subtle">{t("keptFromOld")}</span>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-medium text-ink">{t("stepsDone")}</h2>
            <ol className="mt-4 flex flex-col divide-y divide-line">
              {steps.map(({ icon: StepIcon, title, detail }) => (
                <li key={title} className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <StepIcon aria-hidden className="size-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-[11px] text-muted">{detail}</p>
                    </div>
                  </div>
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-brand" strokeWidth={2} />
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-center gap-2.5 rounded-lg bg-page px-4 py-3 text-xs text-body">
              <ArrowLeftRight aria-hidden className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>
                {t(sameDateSlot ? "summarySameSlot" : "summaryChangedSlot", {
                  fromCourt: result.from.courtName,
                  toCourt: result.to.courtName,
                  date: f.date(result.to.date),
                  slot: f.timeRange(result.to.start, result.to.end),
                  price: f.currency(result.pricePerHour),
                })}
              </span>
            </p>
          </Card>
        </div>
        <div className="mt-5 flex justify-end">
          <Link href={`${base}/reschedule`} className="inline-flex h-[46px] items-center gap-2 rounded-lg bg-brand px-6 text-[13px] font-semibold text-white hover:bg-brand-dark">
            <ArrowLeft aria-hidden className="size-4" />
            {t("backToReschedule")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={t("title")} subtitle={data ? t("pickSub", { code: data.booking.code, name: data.booking.customerName }) : undefined} action={back} />
      {options.isPending ? (
        <Card>
          <SkeletonRows rows={6} />
        </Card>
      ) : options.isError || !data ? (
        <Card>
          {options.error instanceof ApiError && options.error.status === 404 ? <EmptyState title={errorText(options.error, "errors.bookingNotFound")} /> : <ErrorState error={options.error} onRetry={() => options.refetch()} />}
        </Card>
      ) : (
        <>
          <p className="mb-5 flex items-center gap-2.5 rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand">
            <Info aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {t("rule")}
          </p>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,326px)_minmax(0,1fr)]">
            <Card className="p-5">
              <h2 className="text-base font-medium text-ink">{t("current")}</h2>
              <p className="mt-4 text-[10px] text-subtle">{th("codeLabel")}</p>
              <p className="mt-1.5 text-lg font-semibold text-ink">{data.booking.code}</p>
              <p className="mt-2 text-sm font-medium text-ink">{data.booking.customerName}</p>
              <p className="mt-1.5 text-[11px] text-muted">{data.booking.customerPhone}</p>
              <dl className="mt-5 flex flex-col gap-3.5 border-t border-line pt-5 text-xs">
                {(
                  [
                    [tc("court"), data.booking.courtName],
                    [tb("playDate"), f.date(data.booking.date)],
                    [tb("slot"), f.timeRange(data.booking.start, data.booking.end)],
                    [t("duration"), hours],
                    [t("oldPrice"), t("perHour", { amount: f.currency(data.booking.pricePerHour) })],
                    [t("totalAmount"), f.currency(data.booking.amount)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-subtle">{label}</dt>
                    <dd className="font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-2 text-[10px] text-subtle">{th("payStatus")}</p>
                <PaymentStatusBadge status={data.booking.paymentStatus} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-ink">{t("pickTitle")}</h2>
                <span className="text-[10px] text-subtle">{t("stepHint")}</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("newCourt")} htmlFor="newCourt">
                  <Select
                    id="newCourt"
                    value={data.courtId}
                    onChange={(event) => {
                      setPicked(null);
                      setTarget({ courtId: event.target.value, date: data.date });
                    }}
                  >
                    {data.courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("newDate")} htmlFor="newDate">
                  <DatePicker
                    id="newDate"
                    value={data.date}
                    min={data.today}
                    align="right"
                    onChange={(date) => {
                      if (!date) return;
                      setPicked(null);
                      setTarget({ courtId: data.courtId, date });
                    }}
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink">{t("newSlot", { hours })}</p>
                <p className="text-[10px] text-subtle">
                  {t("oldPrice")}: {t("perHour", { amount: f.currency(data.booking.pricePerHour) })}
                </p>
              </div>
              {data.options.length === 0 ? (
                <EmptyState title={errorText(new ApiError("SLOT_INVALID", 400))} />
              ) : (
                <>
                  <div role="radiogroup" aria-label={t("pickTitle")} className={cn("mt-3 grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3", options.isFetching && "opacity-60")}>
                    {data.options.map((option) => {
                      const ok = option.state === "ok";
                      const active = ok && option.start === picked;
                      return (
                        <button
                          key={option.start}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={!ok}
                          data-option={option.start}
                          data-state={option.state}
                          onClick={() => setPicked(option.start)}
                          className={cn(
                            "relative min-h-[92px] rounded-lg border p-3 text-left",
                            active ? "border-2 border-brand bg-brand-soft" : ok ? "border-line bg-white hover:border-brand" : "cursor-not-allowed border-line bg-page text-subtle",
                          )}
                        >
                          <span className="absolute right-3 top-3 text-brand">
                            {active ? <CircleCheck aria-hidden className="size-4" /> : ok ? <span className="block size-3.5 rounded-full border-[1.5px] border-brand" /> : <Lock aria-hidden className="size-3.5 text-subtle" />}
                          </span>
                          <span className={cn("block text-[13px] font-medium", ok && "text-ink")}>{f.timeRange(option.start, option.end)}</span>
                          <span className="mt-1.5 block text-[10px]">{t("perHour", { amount: f.currency(option.pricePerHour) })}</span>
                          <span className={cn("mt-2 block text-[10px]", ok && "text-brand")}>{active ? t("optSelected") : stateText[option.state]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-brand" />
                      {t("legendOk")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-line" />
                      {t("legendOther")}
                    </span>
                  </div>
                </>
              )}
              {choice && (
                <div className="mt-4 rounded-lg bg-brand-soft px-4 py-3.5 text-brand" data-choice>
                  <p className="flex items-center gap-2.5 text-[13px] font-semibold">
                    <Check aria-hidden className="size-4" strokeWidth={2.5} />
                    {courtName} · {f.date(data.date)} · {f.timeRange(choice.start, choice.end)}
                  </p>
                  <p className="mt-2 text-[11px] text-body">
                    {t("perHour", { amount: f.currency(choice.pricePerHour) })} · {f.currency(data.booking.amount)} · {t("samePrice")}
                  </p>
                  <p className="mt-1.5 text-[11px]">{t("keepPaid", { status: paid })}</p>
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-[11px] text-muted">{t("willNotify")}</p>
                <Button className="h-10 px-5" disabled={!choice} onClick={() => setConfirming(true)} data-reschedule-confirm>
                  {tc("confirm")}
                </Button>
              </div>
            </Card>
          </div>

          {choice && (
            <ConfirmDialog
              open={confirming}
              onClose={() => setConfirming(false)}
              onConfirm={() => move.mutate()}
              loading={move.isPending}
              title={t("confirmTitle")}
              subtitle={t("confirmSub")}
              widthClass="max-w-[520px]"
              footerBetween
              icon={
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <ArrowLeftRight aria-hidden className="size-[18px]" strokeWidth={1.75} />
                </span>
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{data.booking.code}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {data.booking.customerName} · {data.booking.customerPhone}
                  </p>
                </div>
                <PaymentStatusBadge status={data.booking.paymentStatus} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    [t("old"), data.booking.courtName, data.booking.date, data.booking.start, data.booking.end, data.booking.pricePerHour, false],
                    [t("new"), courtName, data.date, choice.start, choice.end, choice.pricePerHour, true],
                  ] as const
                ).map(([label, court, date, start, end, price, fresh]) => (
                  <div key={label} className={cn("rounded-lg border p-3.5", fresh ? "border-brand bg-brand-soft" : "border-line")}>
                    <p className={cn("text-[10px] font-semibold", fresh ? "text-brand" : "text-subtle")}>{label}</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{court}</p>
                    <p className="mt-1 text-[11px] text-body">
                      {f.date(date)} · {f.timeRange(start, end)}
                    </p>
                    <p className="mt-2 text-[10px] text-subtle">
                      {t("perHour", { amount: f.currency(price) })} · {hours}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink">{f.currency(data.booking.amount)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-brand">
                <CircleCheck aria-hidden className="size-4" strokeWidth={1.75} />
                {t("sameKeep", { status: paid })}
              </p>
              <div className="mt-3 rounded-lg bg-page px-4 py-3 text-[11px] text-body">
                <p className="font-semibold text-ink">{t("afterTitle")}</p>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-start gap-2">
                    <CalendarCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={1.75} />
                    <span>{t("after1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <LockOpen aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={1.75} />
                    <span>{t("after2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Send aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={1.75} />
                    <span>{t("after3")}</span>
                  </li>
                </ul>
              </div>
            </ConfirmDialog>
          )}
        </>
      )}
    </div>
  );
}
