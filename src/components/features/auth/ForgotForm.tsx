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
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { authFlow } from "@/lib/authFlow";
import { authApi } from "@/services/api/auth";
import { forgotSchema, type ForgotInput } from "@/shared/schemas/auth";
import { AuthFooter } from "./AuthFooter";

export function ForgotForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const challenge = await authApi.forgot(values);
      authFlow.setOtp({ email: values.email.trim().toLowerCase(), purpose: "reset", ...challenge });
      router.push("/verify-otp");
    } catch (error) {
      setFailure(error);
    }
  });

  return (
    <AuthLayout title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {failure != null && <Banner tone="error" title={errorText(failure)} />}
        <Field label={t("registeredEmail")} htmlFor="email" size="lg" error={fieldError(errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" controlSize="lg" placeholder={t("registeredEmailPlaceholder")} invalid={!!errors.email} {...register("email")} />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t("send")}
        </Button>
      </form>
      <AuthFooter href="/login" link={t("backToLogin")} withArrow />
    </AuthLayout>
  );
}
