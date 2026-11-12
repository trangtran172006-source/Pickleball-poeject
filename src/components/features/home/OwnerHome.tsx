"use client";

import Link from "next/link";
import { CalendarCheck2, Gauge, LayoutGrid, TriangleAlert, Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/useMe";
import { useFormat } from "@/i18n/useFormat";
import { ownerApi } from "@/services/api/owner";
import type { OwnerHome as OwnerHomeData } from "@/shared/types";

/** UI_38 – owner dashboard: revenue, occupancy, 7-day chart, court status, today, attention. */
export function OwnerHome() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const f = useFormat();
  const me = useMe();
  const home = useQuery({ queryKey: ["owner-home"], queryFn: ownerApi.home, refetchInterval: 60_000 });
  const data = home.data;
  const firstName = me.data?.fullName ?? "";
  const delta = (value: number) => (
    <span className={cn("text-[11px]", value >= 0 ? "text-brand" : "text-danger")}>
      {value >= 0 ? "↑" : "↓"} {t("vsYesterday", { percent: Math.abs(value) })}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink sm:text-[28px]">{t("ownerGreeting", { name: firstName })}</h1>
          <p className="mt-2 text-[13px] text-muted">{t("ownerSub")}</p>
        </div>
        <Link href="/owner/booking" className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand-dark">
          + {t("createBooking")}
        </Link>
      </div>

      {home.isPending ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-[132px]" />
          ))}
        </div>
      ) : home.isError || !data ? (
        <Card>
          <ErrorState error={home.error} onRetry={() => home.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Wallet} label={t("revenueToday")} value={f.currency(data.revenueToday)} foot={delta(data.revenueTodayDelta)} />
            <Kpi icon={CalendarCheck2} label={t("bookingsCount")} value={String(data.bookings)} foot={<span className="text-[11px] text-muted">{t("bookingsSplit", { confirmed: data.bookingsConfirmed, pending: data.bookingsPending })}</span>} />
            <Kpi icon={Gauge} label={t("occupancy")} value={`${data.occupancy}%`} foot={delta(data.occupancyDelta)} />
            <Kpi icon={LayoutGrid} label={t("courtsActive")} value={`${data.courtsActive} / ${data.courtsTotal}`} foot={<span className="text-[11px] text-muted">{t("courtsFreeNow", { count: data.courtsFreeNow })}</span>} />
          </div>

          <div className="grid items-start gap-5 *:min-w-0 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-ink">{t("revenue7")}</h2>
                <Link href="/owner/reports/court" className="text-xs font-semibold text-brand hover:underline">
                  {t("report")} →
                </Link>
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold text-ink">{f.currency(data.revenue7Total)}</span>
                {delta(data.revenue7Delta)}
              </p>
              <RevenueChart data={data.revenue7} />
            </Card>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-ink">{t("courtState")}</h2>
                <Link href="/owner/courts/status" className="text-xs font-semibold text-brand hover:underline">
                  {t("manage")} →
                </Link>
              </div>
              <StateBar state={data.courtState} />
              <ul className="mt-4 flex flex-col gap-3 text-[13px]">
                {(
                  [
                    ["#1a6c2e", t("stateInUse"), data.courtState.inUse],
                    ["#9bd3ab", t("stateReady"), data.courtState.ready],
                    ["#f1d58a", t("stateMaintenance"), data.courtState.maintenance],
                  ] as const
                ).map(([color, label, value]) => (
                  <li key={label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-body">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
                      {label}
                    </span>
                    <span className="font-semibold text-ink">{t("courtsN", { count: value })}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid items-start gap-5 *:min-w-0 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-ink">{t("todayBookings")}</h2>
                <Link href="/owner/bookings" className="text-xs font-semibold text-brand hover:underline">
                  {tc("viewAll")} →
                </Link>
              </div>
              {data.today.length === 0 ? (
                <p className="mt-4 rounded-lg bg-page px-4 py-5 text-center text-xs text-muted">{t("noTodayBookings")}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead className="text-[10px] text-subtle">
                      <tr>
                        <th scope="col" className="py-2 font-medium">{tc("customer")}</th>
                        <th scope="col" className="py-2 font-medium">{tc("court")}</th>
                        <th scope="col" className="py-2 font-medium">{t("slot")}</th>
                        <th scope="col" className="py-2 font-medium">{tc("status")}</th>
                        <th scope="col" className="py-2 text-right font-medium">{t("lineTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.today.map((row) => (
                        <tr key={row.id} className="border-t border-line text-xs">
                          <td className="py-3.5 font-medium text-ink">{row.customerName}</td>
                          <td className="whitespace-nowrap py-3.5 text-body">{row.courtName}</td>
                          <td className="whitespace-nowrap py-3.5 text-muted">{f.timeRange(row.start, row.end)}</td>
                          <td className="py-3.5">
                            <BookingStatusBadge status={row.status} />
                          </td>
                          <td className="whitespace-nowrap py-3.5 text-right font-semibold text-ink">{f.currency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-warn-soft px-5 py-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-warn">
                  <TriangleAlert aria-hidden className="size-3.5" strokeWidth={1.75} />
                  {t("attention")} · {t("newRequests", { count: data.attention })}
                </span>
                <p className="mt-3 text-xs text-warn/90">{t("attentionDesc")}</p>
                <Link href="/owner/bookings" className="mt-3 inline-block text-xs font-semibold text-warn underline underline-offset-2">
                  {t("handle")} →
                </Link>
              </div>
              <Card className="flex items-center gap-3 px-5 py-4">
                <Users aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
                <div>
                  <p className="text-[13px] font-semibold text-ink">{t("staffOnDuty", { count: data.staffOnDuty })}</p>
                  <p className="mt-0.5 text-[11px] text-subtle">{data.shiftLabel}</p>
                </div>
              </Card>
              <p className="px-1 text-[11px] text-subtle">{t("updatedAt", { time: f.time(data.updatedAt) })}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, foot }: { icon: typeof Wallet; label: string; value: string; foot: React.ReactNode }) {
  return (
    <Card className="p-5" data-kpi>
      <div className="flex items-center justify-between text-xs text-muted">
        {label}
        <Icon aria-hidden className="size-[18px] text-brand" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-3">{foot}</p>
    </Card>
  );
}

function RevenueChart({ data }: { data: OwnerHomeData["revenue7"] }) {
  const f = useFormat();
  const max = Math.max(1, ...data.map((item) => item.amount));
  return (
    <div className="mt-5 flex h-[150px] items-end gap-2" role="img" aria-label="">
      {data.map((item, index) => (
        <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className={cn("w-full rounded-t", index === data.length - 1 ? "bg-brand" : "bg-[#9bd3ab]")} style={{ height: `${Math.max(4, (item.amount / max) * 100)}%` }} title={f.currency(item.amount)} />
          </div>
          <span className="text-[9px] text-subtle">{`${+item.date.slice(8, 10)}/${+item.date.slice(5, 7)}`}</span>
        </div>
      ))}
    </div>
  );
}

function StateBar({ state }: { state: OwnerHomeData["courtState"] }) {
  const total = Math.max(1, state.inUse + state.ready + state.maintenance);
  const seg = (value: number, color: string) => value > 0 && <span className="block h-full" style={{ width: `${(value / total) * 100}%`, background: color }} />;
  return (
    <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-page">
      {seg(state.inUse, "#1a6c2e")}
      {seg(state.ready, "#9bd3ab")}
      {seg(state.maintenance, "#f1d58a")}
    </div>
  );
}
