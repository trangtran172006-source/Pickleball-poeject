"use client";

import { useEffect } from "react";
import { Landmark, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { settingsApi } from "@/services/api/owner";

const schema = z.object({
  bankName: z.string().trim().min(2, "required").max(60, "wrongFormat"),
  bankBin: z.string().trim().regex(/^\d{6}$/, "wrongFormat"),
  holder: z.string().trim().min(2, "required").max(70, "wrongFormat"),
  account: z.string().trim().regex(/^\d{6,20}$/, "wrongFormat"),
  hotline: z.string().trim().regex(/^0\d{9}$/, "phone"),
});
type FormValues = z.infer<typeof schema>;

/** Owner settings – receiving bank account used to build the VietQR code (Q15). */
export function SettingsView() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const current = useQuery({ queryKey: ["settings-bank"], queryFn: () => settingsApi.get() });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (current.data) reset(current.data);
  }, [current.data, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => settingsApi.save(values),
    onSuccess: (data) => {
      toast.show("success", t("saved"));
      reset(data);
      void client.invalidateQueries({ queryKey: ["settings-bank"] });
    },
    onError: (error) => toast.show("error", errorText(error, "errors.settingsSaveFailed")),
  });

  return (
    <div>
      <PageTitle title={t("title")} />
      {current.isPending ? (
        <Skeleton className="h-80 max-w-2xl rounded-2xl" />
      ) : current.isError ? (
        <ErrorState error={current.error} onRetry={() => current.refetch()} />
      ) : (
        <Card className="max-w-2xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <Landmark aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
            <div>
              <h2 className="text-base font-medium text-ink">{t("bankTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted">{t("bankSub")}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
            <Field label={t("bank")} htmlFor="bankName" required error={fieldError(errors.bankName?.message)}>
              <Input id="bankName" invalid={!!errors.bankName} {...register("bankName")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("bin")} htmlFor="bankBin" required error={fieldError(errors.bankBin?.message)}>
                <Input id="bankBin" inputMode="numeric" placeholder="970436" invalid={!!errors.bankBin} {...register("bankBin")} />
              </Field>
              <Field label={t("account")} htmlFor="account" required error={fieldError(errors.account?.message)}>
                <Input id="account" inputMode="numeric" invalid={!!errors.account} {...register("account")} />
              </Field>
            </div>
            <Field label={t("holder")} htmlFor="holder" required error={fieldError(errors.holder?.message)}>
              <Input id="holder" invalid={!!errors.holder} {...register("holder")} />
            </Field>
            <Field label={t("hotline")} htmlFor="hotline" required error={fieldError(errors.hotline?.message)}>
              <Input id="hotline" inputMode="numeric" invalid={!!errors.hotline} {...register("hotline")} />
            </Field>
            <div className="mt-1 flex justify-end">
              <Button type="submit" loading={save.isPending} disabled={!isDirty} iconLeft={<Save aria-hidden className="size-4" />} data-save-settings>
                {tc("save")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
