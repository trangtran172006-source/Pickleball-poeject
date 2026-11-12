"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { authFlow } from "@/lib/authFlow";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/services/api/client";
import { loginSchema, type LoginInput } from "@/shared/schemas/auth";
import { AuthFooter } from "./AuthFooter";

type Props = { notice?: "registered" | "passwordUpdated" };

export function LoginForm({ notice }: Props) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const result = await authApi.login(values);
      router.replace(result.redirect);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_VERIFIED") {
        const details = error.details as { maskedEmail?: string; resendAvailableAt?: string };
        authFlow.setOtp({
          email: values.email.trim().toLowerCase(),
          maskedEmail: details.maskedEmail ?? values.email,
          purpose: "register",
          resendAvailableAt: details.resendAvailableAt ?? new Date().toISOString(),
        });
        router.push("/verify-otp");
        return;
      }
      setFailure(error);
    }
  });

  return (
    <AuthLayout title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice && failure == null && (
          <Banner tone="success" title={notice === "registered" ? t("registerSuccess") : t("passwordUpdated")} />
        )}
        {failure != null && <Banner tone="error" title={errorText(failure, "auth.loginFailed")} />}
        <Field label={tc("email")} htmlFor="email" size="lg" error={fieldError(errors.email?.message)}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            controlSize="lg"
            placeholder={t("emailPlaceholder")}
            invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <div>
          <Field label={tc("password")} htmlFor="password" size="lg" error={fieldError(errors.password?.message)}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              controlSize="lg"
              placeholder={t("passwordPlaceholder")}
              invalid={!!errors.password}
              {...register("password")}
            />
          </Field>
          <div className="mt-3.5 text-right">
            <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
              {t("forgotLink")}
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t("loginButton")}
        </Button>
      </form>
      <AuthFooter question={t("noAccount")} href="/register" link={t("registerLink")} />
    </AuthLayout>
  );
}
