"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleCheck, LogIn, Plus, Sun, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/useMe";
import { shiftNameKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { staffApi } from "@/services/api/staff";
import type { QueueState, StaffHome as StaffHomeData } from "@/shared/types";

const two = (value: number) => String(value).padStart(2, "0");

/** UI_20 – shift overview, bookings to handle and the shift task list. */
export function StaffHome({ base }: { base: string }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const me = useMe();
  const home = useQuery({ queryKey: ["staff-home"], queryFn: staffApi.home, refetchInterval: 30_000 });
  const data = home.data;

  const checkIn = useMutation({
    mutationFn: (id: string) => staffApi.checkInBooking(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["staff-home"] }),
    onError: (error) => toast.show("error", errorText(error)),
  });
  // Ticks are shown immediately and rolled back if the server refuses them.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const untick = (id: string) => setTicks((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
  const toggle = useMutation({
    mutationFn: (task: { id: string; done: boolean }) => staffApi.toggleTask(task.id, task.done),
    onSuccess: (updated) => {
      client.setQueryData<StaffHomeData>(["staff-home"], (current) => current && { ...current, tasks: current.tasks.map((item) => (item.id === updated.id ? updated : item)) });
    },
    onError: (error) => toast.show("error", errorText(error)),
    onSettled: (_data, _error, task) => untick(task.id),
  });

  const shiftName = data?.shift ? (data.shift.name in shiftNameKey ? tc(shiftNameKey[data.shift.name as keyof typeof shiftNameKey]) : data.shift.name) : "—";
  const stateLook: Record<QueueState, { tone: "amber" | "green"; label: string }> = {
    awaitingCheckIn: { tone: "amber", label: ts("bookingAwaitingCheckIn") },
    inUse: { tone: "green", label: ts("bookingInUse") },
    awaitingPayment: { tone: "amber", label: ts("paymentPending") },
  };
  const kpis = data
    ? [
        { label: t("kpiShiftBookings"), value: data.kpi.bookings, note: t("kpiUpcoming", { count: data.kpi.upcoming2h }), icon: CalendarDays },
        { label: t("kpiAwaiting"), value: data.kpi.awaitingCheckIn, note: data.kpi.nextAt ? t("kpiNextAt", { time: data.kpi.nextAt }) : "—", icon: LogIn },
        { label: t("kpiAwaitingPay"), value: data.kpi.awaitingPayment, note: t("kpiToCollect", { amount: f.currency(data.kpi.toCollect) }), icon: WalletCards },
        { label: t("kpiReady"), value: data.kpi.courtsReady.length, note: data.kpi.courtsReady.join(", ") || "—", icon: CircleCheck },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink sm:text-[26px]">{t("staffGreeting")}</h1>
          <p className="mt-2 text-xs text-muted">
            {me.data?.fullName} · {tc("appName")} · {data ? f.dateLong(data.date) : ""}
          </p>
        </div>
        <Link href={`${base}/booking`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand-dark">
          <Plus aria-hidden className="size-4" />
          {t("createBooking")}
        </Link>
      </div>

      <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand via-[#2c8a4b] to-[#3a8050] px-6 py-5 text-white">
        <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
          <Sun aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-lg font-medium" data-shift-name>{shiftName}</p>
          <p className="mt-1 text-[11px] text-white/90">{t("shiftIn", { shift: shiftName })}</p>
        </div>
      </section>

      {home.isPending ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-[140px]" />
          ))}
        </div>
      ) : home.isError ? (
        <Card>
          <ErrorState error={home.error} onRetry={() => home.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="p-5" data-kpi>
                <div className="flex items-center justify-between text-xs text-muted">
                  {kpi.label}
                  <kpi.icon aria-hidden className="size-[18px] text-brand" strokeWidth={1.5} />
                </div>
                <p className="mt-4 text-[28px] font-semibold leading-none text-ink">{two(kpi.value)}</p>
                <p className="mt-4 truncate text-[11px] text-brand">{kpi.note}</p>
              </Card>
            ))}
          </div>

          <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_310px]">
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-medium text-ink">{t("toProcess")}</h2>
              {data!.queue.length === 0 ? (
                <EmptyState title={t("nothingToProcess")} />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead className="bg-page text-[10px] text-subtle">
                      <tr>
                        <th scope="col" className="rounded-l-md px-3 py-3 font-medium">{tc("customer")}</th>
                        <th scope="col" className="px-3 py-3 font-medium">{tc("court")}</th>
                        <th scope="col" className="px-3 py-3 font-medium">{t("slot")}</th>
                        <th scope="col" className="px-3 py-3 font-medium">{tc("status")}</th>
                        <th scope="col" className="rounded-r-md px-3 py-3 font-medium">{t("task")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.queue.map(({ booking, state }) => (
                        <tr key={booking.id} data-queue={state} className="border-b border-line text-xs">
                          <td className="px-3 py-4 font-medium text-ink">{booking.customerName}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-ink">{booking.courtName}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-muted">{f.timeRange(booking.start, booking.end)}</td>
                          <td className="px-3 py-4">
                            <Badge tone={stateLook[state].tone}>{stateLook[state].label}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4">
                            {state === "awaitingCheckIn" ? (
                              <button type="button" disabled={checkIn.isPending} onClick={() => checkIn.mutate(booking.id)} className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50">
                                {t("checkIn")}
                              </button>
                            ) : (
                              <Link href={`${base}/bookings/${booking.id}`} className="text-[11px] font-semibold text-brand hover:underline">
                                {state === "awaitingPayment" ? t("collect") : t("detail")}
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-medium text-ink">{t("tasksTitle")}</h2>
              {data!.tasks.length === 0 ? (
                <p className="mt-4 text-xs text-muted">{t("noTasks")}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-4 border-b border-line pb-5">
                  {data!.tasks.map((task) => (
                    <li key={task.id}>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={ticks[task.id] ?? task.done}
                          onChange={(event) => {
                            setTicks({ ...ticks, [task.id]: event.target.checked });
                            toggle.mutate({ id: task.id, done: event.target.checked });
                          }} className="mt-0.5 size-[18px] shrink-0 rounded accent-[#1a6c2e]" />
                        <span className="min-w-0">
                          <span className={cn("block text-xs font-medium text-ink", (ticks[task.id] ?? task.done) && "text-muted line-through")}>{task.name}</span>
                          <span className="mt-1 block text-[10px] text-subtle">{[task.time, task.note].filter(Boolean).join(" · ")}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
