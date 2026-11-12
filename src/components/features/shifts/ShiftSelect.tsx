"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleCheck, ClipboardCheck, Info, LogOut, Moon, Sun, Sunrise } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/dates";
import { useLogout } from "@/lib/useLogout";
import { useMe } from "@/lib/useMe";
import { shiftNameKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { shiftsApi } from "@/services/api/staff";
import type { ShiftName, ShiftOption } from "@/shared/types";

const looks: Record<ShiftName, { icon: typeof Sun; desc: "morningDesc" | "afternoonDesc" | "eveningDesc" }> = {
  "Ca sáng": { icon: Sunrise, desc: "morningDesc" },
  "Ca chiều": { icon: Sun, desc: "afternoonDesc" },
  "Ca tối": { icon: Moon, desc: "eveningDesc" },
};

/** UI_19 – a staff member confirms the shift they were assigned before working. */
export function ShiftSelect() {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const router = useRouter();
  const client = useQueryClient();
  const logout = useLogout();
  const errorText = useApiErrorMessage();
  const me = useMe();
  const today = useQuery({ queryKey: ["shifts-today"], queryFn: shiftsApi.today, refetchInterval: 60_000 });
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (me.data && me.data.role !== "staff") router.replace(me.data.role === "owner" ? "/owner" : "/customer");
    if (today.data?.checkedIn && me.data?.shift?.checkedIn) router.replace("/staff");
  }, [me.data, today.data, router]);

  const usable = (shift: ShiftOption) => shift.assigned && shift.inHours && !!shift.id;
  const options = today.data?.shifts ?? [];
  const selected = options.find((shift) => shift.id === picked && usable(shift)) ?? options.find(usable) ?? null;
  const checkIn = useMutation({
    mutationFn: () => shiftsApi.checkIn(selected!.id!),
    onSuccess: (updated) => {
      client.setQueryData(["me"], updated);
      router.replace("/staff");
    },
  });
  const firstName = me.data?.fullName.trim().split(/\s+/).pop() ?? "";

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center justify-end gap-3 bg-brand px-4 text-white lg:h-[72px] lg:px-9">
        <span className="mr-1 hidden text-[13px] sm:block">{f.dateLong(todayISO())}</span>
        <LanguageSwitcher tone="dark" />
        <Avatar name={me.data?.fullName ?? ""} className="bg-white" />
        <span className="hidden sm:block">
          <span className="block text-[13px] font-semibold leading-tight">{me.data?.fullName ?? "…"}</span>
          <span className="mt-0.5 block text-[11px] text-white/85">{ts("shiftNotStarted")}</span>
        </span>
        <button type="button" onClick={logout} aria-label={tc("logout")} title={tc("logout")} className="flex size-9 items-center justify-center rounded-md hover:bg-white/10">
          <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </button>
      </header>
      <main className="mx-auto max-w-[1368px] px-4 py-8 lg:px-9">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-ink sm:text-[28px]">{t("pickTitle")}</h1>
            <p className="mt-2 text-[13px] text-muted">{t("pickSub", { name: firstName })}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[11px] text-body">
            <span className="size-1.5 rounded-full bg-body" />
            {ts("shiftNotStarted")}
          </span>
        </div>

        <Card>
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-medium text-ink">{t("which")}</h2>
                <p className="mt-1.5 text-xs text-muted">{t("whichSub")}</p>
              </div>
              <span className="text-[11px] text-subtle">{t("pickOne", { count: options.length || 3 })}</span>
            </div>
            {today.isPending ? (
              <div role="status" className="mt-5 grid gap-5 md:grid-cols-3">
                {[0, 1, 2].map((key) => (
                  <Skeleton key={key} className="h-[226px]" />
                ))}
              </div>
            ) : today.isError ? (
              <ErrorState error={today.error} onRetry={() => today.refetch()} className="px-0" />
            ) : (
              <div role="radiogroup" aria-label={t("which")} className="mt-5 grid gap-5 md:grid-cols-3">
                {options.map((shift) => {
                  const look = looks[shift.name];
                  const enabled = usable(shift);
                  const active = selected?.name === shift.name;
                  return (
                    <button
                      key={shift.name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={!enabled}
                      data-shift={shift.name}
                      onClick={() => setPicked(shift.id)}
                      className={cn(
                        "relative flex min-h-[226px] flex-col rounded-xl border p-6 text-left",
                        active ? "border-2 border-brand bg-brand-soft" : "border-line bg-white",
                        enabled ? !active && "hover:border-brand" : "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className={cn("absolute right-6 top-6 flex size-5 items-center justify-center rounded-full border", active ? "border-brand bg-brand text-white" : "border-[#c9d2cb]")}>
                        {active && <Check aria-hidden className="size-3" strokeWidth={3} />}
                      </span>
                      <span className={cn("flex size-14 items-center justify-center rounded-xl", active ? "bg-brand text-white" : "bg-page text-brand")}>
                        <look.icon aria-hidden className="size-6" strokeWidth={1.5} />
                      </span>
                      <span className={cn("mt-5 text-[22px] font-medium", active ? "text-brand" : "text-ink")}>{tc(shiftNameKey[shift.name])}</span>
                      <span className="mt-2 text-xs text-muted">
                        {t(look.desc)} · {shift.start}–{shift.end}
                      </span>
                      <span className={cn("mt-auto pt-5 text-[11px]", active ? "font-semibold text-brand" : "text-muted")}>
                        {active ? t("selected") : !shift.assigned ? t("notAssigned") : !shift.inHours ? t("outOfHours") : t("select")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-5 flex items-center gap-2 text-[11px] text-muted">
              <Info aria-hidden className="size-4" strokeWidth={1.5} />
              {t("hoursNote")}
            </p>
            {today.data && !options.some(usable) && <Banner tone="warn" className="mt-4" title={t("blockedTitle")}>{t("blockedDesc")}</Banner>}
            {checkIn.isError && <Banner tone="error" className="mt-4" title={errorText(checkIn.error, "errors.shiftRequired")} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line p-5 sm:px-7">
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <CircleCheck aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-[11px] text-subtle">{t("chosen")}</p>
                <p className="mt-0.5 text-[15px] font-semibold text-brand" data-chosen>
                  {selected ? tc(shiftNameKey[selected.name]) : "—"}
                </p>
              </div>
            </div>
            <Button className="h-12 px-6 text-sm" disabled={!selected} loading={checkIn.isPending} onClick={() => checkIn.mutate()} iconRight={<ArrowRight aria-hidden className="size-4" />} data-check-in>
              {t("checkIn")}
            </Button>
          </div>
        </Card>

        <div className="mt-7 flex items-start gap-3.5 rounded-xl bg-brand-soft/70 px-6 py-5 text-brand">
          <ClipboardCheck aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold">{t("readyTitle")}</p>
            <p className="mt-1.5 text-[11px]">{t("readyDesc")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
