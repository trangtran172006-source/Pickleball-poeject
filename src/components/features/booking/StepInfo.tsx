"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Headphones, Info, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { useMe } from "@/lib/useMe";
import { useFormat } from "@/i18n/useFormat";
import { ApiError } from "@/services/api/client";
import { bookingsApi, courtsApi } from "@/services/api/customer";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/shared/schemas/auth";
import { BookingSummaryCard } from "./BookingSummaryCard";
import type { BookerForm, StepProps } from "./types";
import { VenueCard } from "./VenueCard";

const schema = (emailRequired: boolean) =>
  z.object({
    fullName: z.string().trim().min(1, "required").max(100, "wrongFormat"),
    phone: z.string().trim().min(1, "required").regex(PHONE_PATTERN, "phoneInvalid"),
    email: z
      .string()
      .trim()
      .max(100, "wrongFormat")
      .refine((value) => (value === "" ? !emailRequired : EMAIL_PATTERN.test(value)), { message: emailRequired ? "required" : "emailInvalid" })
      .refine((value) => value === "" || EMAIL_PATTERN.test(value), "emailInvalid"),
    note: z.string().max(300, "wrongFormat"),
    agreed: z.boolean().refine((value) => value, "termsRequired"),
  });

export function SupportCard() {
  const tc = useTranslations("common");
  const settings = useQuery({ queryKey: ["settings"], queryFn: courtsApi.settings, staleTime: 300_000 });
  if (!settings.data?.hotline) return null;
  return (
    <div className="flex items-center gap-3 px-1 text-xs">
      <Headphones aria-hidden className="size-4 text-subtle" strokeWidth={1.5} />
      <div>
        <p className="text-muted">{tc("needHelp")}</p>
        <a href={`tel:${settings.data.hotline.replace(/\s/g, "")}`} className="mt-0.5 block font-semibold text-brand">
          {settings.data.hotline}
        </a>
      </div>
    </div>
  );
}

/** Step 2 – booker details, review, terms (UI_14 / UI_26 / UI_27). */
export function StepInfo({ mode, state, update }: StepProps) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const f = useFormat();
  const me = useMe();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const [confirming, setConfirming] = useState<BookerForm | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const selection = state.selection;
  const prefill = mode === "customer" && !state.form && me.data;

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, submitCount },
  } = useForm<BookerForm>({
    resolver: zodResolver(schema(mode === "customer")),
    defaultValues: state.form ?? { fullName: "", phone: "", email: "", note: "", agreed: false },
  });

  // Customers start from their account details (shown as "pre-filled" in the design).
  useEffect(() => {
    if (prefill) reset({ fullName: me.data!.fullName, phone: me.data!.phone, email: me.data!.email, note: "", agreed: false });
  }, [prefill, me.data, reset]);

  const hold = useMutation({
    mutationFn: (form: BookerForm) =>
      bookingsApi.hold({
        courtId: state.range!.courtId,
        date: state.date!,
        start: state.range!.start,
        end: state.range!.end,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        note: form.note.trim(),
      }),
    onSuccess: (result, form) => {
      setConfirming(null);
      update({ step: 2, form, hold: result });
    },
    onError: (error) => {
      setConfirming(null);
      if (error instanceof ApiError && ["SLOT_TAKEN", "COURT_CLOSED", "PAST_DATE", "SLOT_INVALID"].includes(error.code)) {
        toast.show("error", errorText(error));
        void client.invalidateQueries({ queryKey: ["schedule"] });
        update({ step: 0, range: null, selection: null, form: getValues() });
      } else {
        setFailure(error);
      }
    },
  });

  const onSubmit = handleSubmit((form) => {
    setFailure(null);
    if (mode === "staff") setConfirming(form);
    else hold.mutate(form);
  });
  const missingBasics = submitCount > 0 && (errors.fullName?.message === "required" || errors.phone?.message === "required");

  if (!selection || !state.range) return null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
        <VenueCard />
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-medium text-ink">{t("bookerTitle")}</h2>
          <p className="mt-1.5 text-xs text-muted">{t("bookerSub")}</p>
          {mode === "customer" && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-body">
                <User aria-hidden className="size-4" strokeWidth={1.5} />
                {t("useAccount")}
              </span>
              <Badge tone="green">{t("prefilled")}</Badge>
            </div>
          )}
          {missingBasics && <Banner tone="error" className="mt-4" title={tv("bookingInfoRequired")} />}
          {failure != null && <Banner tone="error" className="mt-4" title={errorText(failure)} />}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label={tc("fullName")} htmlFor="fullName" required error={fieldError(errors.fullName?.message)}>
              <Input id="fullName" autoComplete="name" invalid={!!errors.fullName} {...register("fullName")} />
            </Field>
            <Field label={tc("phone")} htmlFor="phone" required error={fieldError(errors.phone?.message)}>
              <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel" invalid={!!errors.phone} {...register("phone")} />
            </Field>
            <Field label={tc("email")} htmlFor="email" required={mode === "customer"} error={fieldError(errors.email?.message)}>
              <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field className="sm:col-span-2" label={t("noteLabel")} htmlFor="note" error={fieldError(errors.note?.message)}>
              <textarea
                id="note"
                rows={3}
                maxLength={300}
                placeholder={t("notePlaceholder")}
                className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-subtle/80 focus:border-brand focus:ring-2 focus:ring-brand/15"
                {...register("note")}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-medium text-ink">{t("review")}</h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
              <CalendarDays aria-hidden className="size-4 text-brand" strokeWidth={1.5} />
              {selection.courtName} · {tc("standardCourt")}
            </span>
            <Badge tone="green">{t("playHours", { count: selection.hours })}</Badge>
          </div>
          <dl className="mt-4 flex flex-col gap-3.5 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">{t("playDate")}</dt>
              <dd className="font-medium text-ink">{f.dateLong(selection.date)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">{t("slot")}</dt>
              <dd className="font-medium text-ink">{f.timeRange(selection.start, selection.end)}</dd>
            </div>
          </dl>
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-xs text-body">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#1a6c2e]" aria-invalid={!!errors.agreed} {...register("agreed")} />
            <span>{t("terms")}</span>
          </label>
          {errors.agreed && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {fieldError(errors.agreed.message)}
            </p>
          )}
        </Card>

        <p className="flex items-start gap-2.5 rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand">
          <Info aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
          {t("confirmNotice")}
        </p>

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="neutral" size="md" className="h-[46px] px-5" onClick={() => update({ step: 0, form: getValues() })} iconLeft={<ArrowLeft aria-hidden className="size-4 text-subtle" />}>
            {mode === "staff" ? tc("back") : t("backToSlots")}
          </Button>
          <Button type="submit" className="h-[46px] px-6" loading={hold.isPending && mode === "customer"} iconRight={<ArrowRight aria-hidden className="size-4" />}>
            {t("confirmPay")}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <BookingSummaryCard selection={selection} />
        <SupportCard />
      </div>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && hold.mutate(confirming)}
        loading={hold.isPending}
        title={t("holdConfirmTitle")}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Clock aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
        }
      >
        <div className="rounded-lg border border-line bg-page p-4 text-xs">
          <p className="text-[13px] font-semibold text-ink">{tc("appName")}</p>
          <dl className="mt-3 flex flex-col gap-2.5">
            {(
              [
                [t("playDate"), f.dateLong(selection.date)],
                [tc("standardCourt"), selection.courtName],
                [t("slot"), f.timeRange(selection.start, selection.end)],
                [t("totalHours"), tc("hours", { count: selection.hours })],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-subtle">{label}</dt>
                <dd className="font-medium text-ink">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-line pt-2.5">
              <dt className="font-medium text-ink">{tc("total")}</dt>
              <dd className="text-sm font-semibold text-brand">{f.currency(selection.total)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-warn">
          <Info aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {t("holdConfirmNote")}
        </p>
      </ConfirmDialog>
    </div>
  );
}
