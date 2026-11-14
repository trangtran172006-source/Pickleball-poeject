"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Select } from "@/components/ui/Select";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { genderKey } from "@/i18n/status";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/services/api/client";
import { GENDERS, registerSchema, type RegisterInput } from "@/shared/schemas/auth";
import { AuthFooter } from "./AuthFooter";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", phone: "", fullName: "", birthYear: "", gender: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const { redirect } = await authApi.register(values);
      router.replace(redirect);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [name, key] of Object.entries(error.fields)) {
          setError(name as keyof RegisterInput, { message: key });
        }
      }
      setFailure(error);
    }
  });

  return (
    <AuthLayout title={t("registerTitle")} subtitle={t("registerSubtitle")} compact>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-[17px]">
        {failure != null && <Banner tone="error" title={errorText(failure)} />}
        <Field label={tc("email")} htmlFor="email" size="lg" required error={fieldError(errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" controlSize="mid" placeholder={t("emailPlaceholder")} invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label={tc("phone")} htmlFor="phone" size="lg" required error={fieldError(errors.phone?.message)}>
          <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel" controlSize="mid" placeholder={t("phonePlaceholder")} invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label={tc("fullName")} htmlFor="fullName" size="lg" required error={fieldError(errors.fullName?.message)}>
          <Input id="fullName" autoComplete="name" controlSize="mid" placeholder={t("namePlaceholder")} invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <div className="grid gap-[17px] sm:grid-cols-2">
          <Field label={t("birthYear")} htmlFor="birthYear" size="lg" error={fieldError(errors.birthYear?.message)}>
            <Input id="birthYear" inputMode="numeric" maxLength={4} controlSize="mid" placeholder={t("birthYearPlaceholder")} invalid={!!errors.birthYear} {...register("birthYear")} />
          </Field>
          <Field label={t("gender")} htmlFor="gender" size="lg" error={fieldError(errors.gender?.message)}>
            <Select id="gender" controlSize="mid" placeholder={t("genderPlaceholder")} invalid={!!errors.gender} {...register("gender")}>
              {GENDERS.map((value) => (
                <option key={value} value={value}>
                  {tc(genderKey[value])}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={tc("password")} htmlFor="password" size="lg" required error={fieldError(errors.password?.message)}>
          <PasswordInput id="password" autoComplete="new-password" controlSize="mid" placeholder={t("passwordPlaceholder")} invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label={t("confirmPassword")} htmlFor="confirmPassword" size="lg" required error={fieldError(errors.confirmPassword?.message)}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" controlSize="mid" placeholder={t("confirmPasswordPlaceholder")} invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2 h-[50px]">
          {t("registerButton")}
        </Button>
      </form>
      <AuthFooter compact question={t("haveAccount")} href="/login" link={t("loginTitle")} />
    </AuthLayout>
  );
}
