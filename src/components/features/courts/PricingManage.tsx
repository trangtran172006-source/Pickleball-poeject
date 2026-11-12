"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { toMinutes } from "@/lib/dates";
import { PricingTable } from "@/components/features/booking/PricingTable";
import { dayGroupKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { courtsApi } from "@/services/api/customer";
import { pricingAdminApi } from "@/services/api/owner";

const GROUPS = ["T2-T6", "T7-CN"] as const;

/** UI_44 – the price table plus the owner form to set a price (UC_6.1). */
export function PricingManage() {
  const t = useTranslations("courts");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const pricing = useQuery({ queryKey: ["pricing"], queryFn: courtsApi.pricing });
  const cells = useQuery({ queryKey: ["price-cells"], queryFn: pricingAdminApi.cells });
  const [form, setForm] = useState({ courtId: "", group: "T2-T6" as (typeof GROUPS)[number], bandId: "", price: "" });
  const [error, setError] = useState<string | null>(null);

  const current = cells.data?.find((cell) => cell.courtId === form.courtId && cell.dayGroup === form.group && cell.bandId === form.bandId);
  const bands = pricing.data?.bands ?? [];
  const courts = pricing.data?.courts ?? [];

  const save = useMutation({
    mutationFn: () => pricingAdminApi.set({ courtId: form.courtId, dayGroup: form.group, bandId: form.bandId, price: Number(form.price) }),
    onSuccess: () => {
      toast.show("success", t("updated"));
      void client.invalidateQueries({ queryKey: ["pricing"] });
      void client.invalidateQueries({ queryKey: ["price-cells"] });
      setForm({ ...form, price: "" });
    },
    onError: (err) => setError(errorText(err, "errors.updateFailed")),
  });

  const submit = () => {
    setError(null);
    if (!form.courtId || !form.bandId) return setError(tv("missingInfo")); // UC_6.1 2a
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price < 0) return setError(tv("priceInvalid"));
    // BR02: a before-16:00 band must stay below the after-16:00 bands.
    if (form.group === "T2-T6" && cells.data) {
      const band = bands.find((item) => item.id === form.bandId);
      if (band) {
        const before = toMinutes(band.start) < 16 * 60;
        const others = cells.data.filter((cell) => cell.courtId === form.courtId && cell.dayGroup === "T2-T6" && cell.bandId !== form.bandId);
        const afterBands = bands.filter((item) => toMinutes(item.start) >= 16 * 60).map((item) => item.id);
        const beforeBands = bands.filter((item) => toMinutes(item.start) < 16 * 60).map((item) => item.id);
        const minAfter = Math.min(...others.filter((cell) => afterBands.includes(cell.bandId)).map((cell) => cell.price), Infinity);
        const maxBefore = Math.max(...others.filter((cell) => beforeBands.includes(cell.bandId)).map((cell) => cell.price), 0);
        if (before && minAfter !== Infinity && price >= minAfter) return setError(tv("priceRule"));
        if (!before && maxBefore > 0 && price <= maxBefore) return setError(tv("priceRule"));
      }
    }
    save.mutate();
  };

  return (
    <div>
      <PageTitle title={t("setPricingTitle")} />
      {pricing.isPending ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : pricing.isError ? (
        <Card>
          <ErrorState error={pricing.error} onRetry={() => pricing.refetch()} />
        </Card>
      ) : (
        <>
          <PricingTable />
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-ink">{t("updatePrice")}</h2>
                <span className="text-[11px] text-subtle">* {tc("required")}</span>
              </div>
              {error && <Banner tone="error" className="mt-4" title={error} />}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={tc("court")} htmlFor="courtId" required error={!form.courtId && error ? fieldError("missingInfo") : undefined}>
                  <Select id="courtId" value={form.courtId} placeholder={t("selectCourt")} onChange={(event) => setForm({ ...form, courtId: event.target.value })}>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("dayGroup")} htmlFor="group" required>
                  <Select id="group" value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value as (typeof GROUPS)[number] })}>
                    {GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {tc(dayGroupKey[group])}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("slot")} htmlFor="bandId" required>
                  <Select id="bandId" value={form.bandId} placeholder="—" onChange={(event) => setForm({ ...form, bandId: event.target.value })}>
                    {bands.map((band) => (
                      <option key={band.id} value={band.id}>
                        {band.start}–{band.end}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("priceInput")} htmlFor="price" required>
                  <Input id="price" inputMode="numeric" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value.replace(/\D/g, "") })} right={<span className="mr-3 text-[11px] text-subtle">{tc("unitPer30")}</span>} />
                </Field>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={submit} loading={save.isPending} iconLeft={<Save aria-hidden className="size-4" />} data-save-price>
                  {t("updateButton")}
                </Button>
              </div>
            </Card>
            <Card className="p-5 sm:p-6">
              <h2 className="text-[13px] font-semibold text-ink">{t("currentPrice")}</h2>
              {form.courtId && form.bandId ? (
                <>
                  <p className="mt-3 text-[11px] text-subtle">
                    {courts.find((court) => court.id === form.courtId)?.name} · {tc(dayGroupKey[form.group])} · {bands.find((band) => band.id === form.bandId)?.start}–{bands.find((band) => band.id === form.bandId)?.end}
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-brand" data-current-price>
                    {current ? f.currency(current.price) : "—"}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-muted">—</p>
              )}
              <div className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[11px] text-muted">
                <span className="font-semibold text-ink">{t("policy")}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">{t("policyWeekday")}</p>
              <p className="mt-1.5 text-[11px] text-muted">{t("policyWeekend")}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
