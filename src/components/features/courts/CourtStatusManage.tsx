"use client";

import { useState } from "react";
import { DoorClosed, Info, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/StatusBadge";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { todayISO } from "@/lib/dates";
import { closureReasonKey, courtStatusKey, type ClosureReason } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { courtStatusApi } from "@/services/api/owner";
import type { ClosureInput, ClosurePreview } from "@/shared/types";

const REASONS: ClosureReason[] = ["Bảo trì", "Thời tiết", "Sự cố"];

/** UI_45 / UI_46 – close a court over a period and record affected bookings (UC_6.2). */
export function CourtStatusManage() {
  const t = useTranslations("courts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tv = useTranslations("validation");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const today = todayISO();
  const list = useQuery({ queryKey: ["court-status", today], queryFn: () => courtStatusApi.list(today) });
  const [form, setForm] = useState<ClosureInput>({ courtId: "", reason: "Bảo trì", startDate: today, startTime: "16:00", endDate: today, endTime: "22:00" });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClosurePreview | null>(null);

  const doPreview = useMutation({
    mutationFn: () => courtStatusApi.preview(form),
    onSuccess: (result) => setPreview(result),
    onError: (err) => setError(errorText(err)),
  });
  const close = useMutation({
    mutationFn: () => courtStatusApi.close(form),
    onSuccess: () => {
      toast.show("success", t("updated"));
      setPreview(null);
      void client.invalidateQueries();
    },
    onError: (err) => {
      setPreview(null);
      setError(errorText(err, "errors.updateFailed"));
    },
  });

  const submit = () => {
    setError(null);
    if (!form.courtId) return setError(tv("missingUpdateInfo")); // UC_6.2 4b
    if (`${form.endDate}T${form.endTime}` <= `${form.startDate}T${form.startTime}`) return setError(tv("endAfterStart"));
    doPreview.mutate();
  };
  const courtName = (id: string) => list.data?.find((court) => court.id === id)?.name ?? id;

  return (
    <div>
      <PageTitle title={t("statusTitle")} />
      <Card className="overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-medium text-ink">{t("courtList")}</h2>
          <p className="mt-1 text-[11px] text-muted">{t("addressIs", { address: tc("address") })}</p>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={2} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-page text-[10px] text-subtle">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">{tc("court")}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t("statusAt")}</th>
                <th scope="col" className="px-5 py-3 font-medium">{tc("status")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((court) => (
                <tr key={court.id} className="border-t border-line">
                  <th scope="row" className="px-5 py-4 font-normal">
                    <span className="block text-xs font-semibold text-ink">{court.name}</span>
                    <span className="mt-1 block text-[10px] text-subtle">{tc("standardCourt")}</span>
                  </th>
                  <td className="px-3 py-4 text-xs text-body">{f.dateTime(court.checkedAt)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={court.status === "Đang hoạt động" ? "green" : "amber"}>{ts(courtStatusKey[court.status])}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-ink">{t("updateInfo")}</h2>
            <span className="text-[11px] text-subtle">* {tc("required")}</span>
          </div>
          {error && <Banner tone="error" className="mt-4" title={error} />}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={tc("court")} htmlFor="courtId" required error={!form.courtId && error ? fieldError("missingUpdateInfo") : undefined}>
              <Select id="courtId" value={form.courtId} placeholder={t("selectCourt")} onChange={(event) => setForm({ ...form, courtId: event.target.value })}>
                {(list.data ?? []).map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("newStatus")} htmlFor="status" required>
              <Select id="status" value="Đóng cửa" disabled>
                <option>{ts("courtClosed")}</option>
              </Select>
            </Field>
            <Field className="sm:col-span-2" label={t("closeReason")} htmlFor="reason" required>
              <Select id="reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value as ClosureReason })}>
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {ts(closureReasonKey[reason])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("startDate")} htmlFor="startDate" required>
              <DatePicker id="startDate" value={form.startDate} min={today} onChange={(value) => value && setForm({ ...form, startDate: value })} />
            </Field>
            <Field label={t("startTime")} htmlFor="startTime" required>
              <Input id="startTime" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            </Field>
            <Field label={t("endDate")} htmlFor="endDate" required>
              <DatePicker id="endDate" value={form.endDate} min={form.startDate} align="right" onChange={(value) => value && setForm({ ...form, endDate: value })} />
            </Field>
            <Field label={t("endTime")} htmlFor="endTime" required>
              <Input id="endTime" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="neutral" onClick={() => setForm({ courtId: "", reason: "Bảo trì", startDate: today, startTime: "16:00", endDate: today, endTime: "22:00" })}>
              {tc("cancel")}
            </Button>
            <Button onClick={submit} loading={doPreview.isPending} iconLeft={<RefreshCw aria-hidden className="size-4" />} data-update-status>
              {t("updateStatus")}
            </Button>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold text-ink">{t("after")}</h2>
          {form.courtId ? (
            <>
              <p className="mt-3 text-sm font-medium text-ink">{courtName(form.courtId)}</p>
              <div className="mt-1.5">
                <Badge tone="amber">{ts("courtClosed")}</Badge>
              </div>
              <p className="mt-3 text-[11px] text-body">
                {f.date(form.startDate)} · {form.startTime}–{form.endTime}
              </p>
              <p className="mt-1 text-[11px] text-subtle">{ts(closureReasonKey[form.reason])}</p>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted">—</p>
          )}
          <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-[11px] text-muted">
            <Info aria-hidden className="mt-px size-4 shrink-0 text-subtle" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-ink">{t("affectedTitle")}</p>
              <p className="mt-1">{t("affectedNote")}</p>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!preview}
        onClose={() => setPreview(null)}
        onConfirm={() => close.mutate()}
        loading={close.isPending}
        title={t("confirmCloseTitle")}
        subtitle={t("confirmCloseAsk")}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warn-soft text-warn">
            <DoorClosed aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
        }
      >
        <div className="rounded-lg bg-page px-4 py-3.5 text-xs">
          <p className="flex items-center justify-between gap-3">
            <span className="font-semibold text-ink">{courtName(form.courtId)}</span>
            <Badge tone="amber">{ts("courtClosed")}</Badge>
          </p>
          <p className="mt-2 text-body">
            {f.date(form.startDate)} · {form.startTime}–{form.endTime} · {ts(closureReasonKey[form.reason])}
          </p>
          {preview && preview.affected > 0 && <p className="mt-2 font-medium text-warn">{t("affectedCount", { count: preview.affected })}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
}
