"use client";

import { CalendarPlus, Info, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { todayISO } from "@/lib/dates";
import { shiftAdminApi } from "@/services/api/owner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPEN = "05:00", CLOSE = "22:00";
const schema = z
  .object({
    staffCode: z.string().trim().min(1, "required").regex(EMAIL_RE, "emailInvalid"),
    date: z.string().min(1, "required"),
    start: z.string().min(1, "required"),
    end: z.string().min(1, "required"),
  })
  .refine((data) => data.end > data.start, { path: ["end"], message: "endAfterStart" })
  .refine((data) => !data.start || data.start >= OPEN, { path: ["start"], message: "shiftHoursRange" })
  .refine((data) => !data.end || data.end <= CLOSE, { path: ["end"], message: "shiftHoursRange" });
type FormValues = z.infer<typeof schema>;

/** UI_41 – the owner creates a shift for a staff member (UC_11.1). */
export function ShiftRegister() {
  const t = useTranslations("shifts");
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { staffCode: "", date: todayISO(), start: "", end: "" } });
  const date = watch("date");

  const create = useMutation({
    mutationFn: (values: FormValues) => shiftAdminApi.register(values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["shifts-admin"] });
      reset({ staffCode: "", date: todayISO(), start: "", end: "" });
    },
  });

  return (
    <div>
      <PageTitle title={t("registerTitle")} />
      <Card className="max-w-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <CalendarPlus aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-medium text-ink">{t("registerCard")}</h2>
            <p className="mt-0.5 text-xs text-muted">{t("registerSub")}</p>
          </div>
        </div>
        {create.isSuccess && (
          <Banner tone="success" className="mb-4" title={t("created")}>
            {create.data?.createdAccount && (
              <div className="mt-1 text-xs">
                <p>{t("accountCreatedHint")}</p>
                <p className="mt-1 font-medium">{t("accountEmail")}: {create.data.createdAccount.email}</p>
                <p className="font-medium">{t("accountPassword")}: <span className="font-mono">{create.data.createdAccount.password}</span></p>
              </div>
            )}
          </Banner>
        )}
        {create.isError && <Banner tone="error" className="mb-4" title={errorText(create.error, "errors.shiftCreateFailed")} />}
        <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("staffCode")} htmlFor="staffCode" required error={create.isError ? undefined : fieldError(errors.staffCode?.message)}>
              <Input id="staffCode" placeholder={t("staffCodePlaceholder")} invalid={!!errors.staffCode} {...register("staffCode")} />
            </Field>
            <Field label={t("workDate")} htmlFor="workDate" required error={fieldError(errors.date?.message)}>
              <DatePicker id="workDate" value={date} min={todayISO()} onChange={(value) => setValue("date", value ?? "", { shouldValidate: true })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("start")} htmlFor="start" required error={fieldError(errors.start?.message)}>
              <Input id="start" type="time" min={OPEN} max={CLOSE} invalid={!!errors.start} {...register("start")} />
            </Field>
            <Field label={t("end")} htmlFor="end" required error={fieldError(errors.end?.message)}>
              <Input id="end" type="time" min={OPEN} max={CLOSE} invalid={!!errors.end} {...register("end")} />
            </Field>
          </div>
          <p className="flex items-center gap-2 text-[11px] text-muted">
            <Info aria-hidden className="size-3.5" strokeWidth={1.5} />
            {t("requiredNote")}
          </p>
          <div className="flex justify-end gap-2.5">
            <Button type="submit" loading={create.isPending} iconLeft={<Plus aria-hidden className="size-4" />} data-create-shift>
              {t("create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
