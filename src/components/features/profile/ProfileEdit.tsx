"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Lock } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/components/ui/ImageDropzone";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Select } from "@/components/ui/Select";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { todayISO } from "@/lib/dates";
import { useMe } from "@/lib/useMe";
import { genderKey } from "@/i18n/status";
import { ApiError } from "@/services/api/client";
import { meApi, uploadToSignedUrl } from "@/services/api/customer";
import { GENDERS, PASSWORD_PATTERN } from "@/shared/schemas/auth";
import type { Gender } from "@/shared/types";

const schema = z
  .object({
    fullName: z.string().trim().min(1, "required").max(100, "wrongFormat"),
    birthDate: z.string().nullable(),
    gender: z.union([z.enum(GENDERS), z.literal("")]),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const changing = data.currentPassword !== "" || data.newPassword !== "" || data.confirmPassword !== "";
    if (!changing) return;
    if (!data.currentPassword) ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "required" });
    if (!PASSWORD_PATTERN.test(data.newPassword)) ctx.addIssue({ code: "custom", path: ["newPassword"], message: data.newPassword ? "passwordRule" : "required" });
    if (data.newPassword !== data.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
  });
type FormValues = z.infer<typeof schema>;

/** UI_9 – edit profile and optionally change the password (UC_8.2). */
export function ProfileEdit() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const me = useMe();
  const picker = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<"fileType" | "fileSize" | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", birthDate: null, gender: "", currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const loaded = useRef(false);
  useEffect(() => {
    if (me.data && !loaded.current) {
      loaded.current = true;
      reset({ fullName: me.data.fullName, birthDate: me.data.birthDate, gender: me.data.gender ?? "", currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  }, [me.data, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      let avatarPath: string | undefined;
      if (photo) avatarPath = await uploadToSignedUrl(await meApi.avatarUploadUrl(photo), photo);
      if (values.newPassword) {
        await meApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, confirmPassword: values.confirmPassword });
      }
      return meApi.update({ fullName: values.fullName.trim(), birthDate: values.birthDate, gender: (values.gender || null) as Gender | null, avatarPath });
    },
    onSuccess: (updated) => {
      client.setQueryData(["me"], updated);
      toast.show("success", t("updated"));
      router.push("/customer/profile");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "WRONG_CURRENT_PASSWORD") setError("currentPassword", { message: "__server" });
      if (error instanceof ApiError) for (const [name, key] of Object.entries(error.fields)) setError(name as keyof FormValues, { message: key });
    },
  });
  const invalid = Object.keys(errors).length > 0;

  if (me.isPending) return <Card><SkeletonRows rows={6} /></Card>;
  if (me.isError || !me.data) return <Card><ErrorState error={me.error} onRetry={() => me.refetch()} /></Card>;

  return (
    <div>
      <PageTitle title={t("editTitle")} subtitle={t("editSub")} />
      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
          {save.isError && <Banner tone="error" className="mb-5" title={errorText(save.error, "errors.updateFailedRetry")} />}
          {invalid && !save.isError && <Banner tone="error" className="mb-5" title={tv("wrongFormat")} />}
          <div className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
            <Avatar name={me.data.fullName} src={preview ?? me.data.avatarUrl} className="size-14 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{me.data.fullName}</p>
              <p className="mt-1 text-xs text-muted">{t("avatarHint")}</p>
              {photoError && <p role="alert" className="mt-1 text-xs text-danger">{tv(photoError)}</p>}
            </div>
            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              tabIndex={-1}
              data-avatar-input
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (!IMAGE_TYPES.includes(file.type)) return setPhotoError("fileType");
                if (file.size > IMAGE_MAX_BYTES) return setPhotoError("fileSize");
                setPhotoError(null);
                setPhoto(file);
              }}
            />
            <Button variant="neutral" onClick={() => picker.current?.click()} iconLeft={<Camera aria-hidden className="size-4" strokeWidth={1.75} />}>
              {t("changeAvatar")}
            </Button>
          </div>

          <h2 className="mt-5 text-[13px] font-semibold text-ink">{t("personal")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label={tc("fullName")} htmlFor="fullName" error={fieldError(errors.fullName?.message)}>
              <Input id="fullName" autoComplete="name" invalid={!!errors.fullName} {...register("fullName")} />
            </Field>
            <Field label={t("birthDate")} htmlFor="birthDate">
              <Controller control={control} name="birthDate" render={({ field }) => <DatePicker id="birthDate" value={field.value} onChange={field.onChange} max={todayISO()} placeholder={t("notSet")} clearable />} />
            </Field>
            <Field label={t("gender")} htmlFor="gender">
              <Select id="gender" placeholder={t("notSet")} {...register("gender")}>
                {GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {tc(genderKey[value])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("email")} htmlFor="email" aside={tc("readOnly")}>
              <Input id="email" value={me.data.email} readOnly right={<Lock aria-hidden className="mr-2 size-3.5 text-subtle" />} />
            </Field>
            <Field label={tc("phone")} htmlFor="phone" aside={tc("readOnly")}>
              <Input id="phone" value={me.data.phone} readOnly right={<Lock aria-hidden className="mr-2 size-3.5 text-subtle" />} />
            </Field>
          </div>
          <p className="mt-2.5 text-[11px] text-muted">{t("contactNote")}</p>

          <h2 className="mt-6 border-t border-line pt-5 text-[13px] font-semibold text-ink">
            {t("changePassword")} <span className="font-normal text-muted">({tc("optional")})</span>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label={t("currentPassword")} htmlFor="currentPassword" error={errors.currentPassword?.message === "__server" ? errorText(save.error) : fieldError(errors.currentPassword?.message)}>
              <PasswordInput id="currentPassword" autoComplete="current-password" placeholder={t("currentPasswordPlaceholder")} invalid={!!errors.currentPassword} {...register("currentPassword")} />
            </Field>
            <Field label={t("newPassword")} htmlFor="newPassword" error={fieldError(errors.newPassword?.message)}>
              <PasswordInput id="newPassword" autoComplete="new-password" placeholder={t("newPasswordPlaceholder")} invalid={!!errors.newPassword} {...register("newPassword")} />
            </Field>
            <Field label={t("confirmNew")} htmlFor="confirmPassword" error={fieldError(errors.confirmPassword?.message)}>
              <PasswordInput id="confirmPassword" autoComplete="new-password" placeholder={t("confirmNewPlaceholder")} invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            </Field>
          </div>
          <p className="mt-2.5 text-[11px] text-muted">{t("passwordHint")}</p>

          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="neutral" onClick={() => router.push("/customer/profile")} disabled={save.isPending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
