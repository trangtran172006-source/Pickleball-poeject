"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Spinner } from "@/components/ui/Spinner";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { authFlow, useResetContext } from "@/lib/authFlow";
import { authApi } from "@/services/api/auth";
import { resetSchema, type ResetInput } from "@/shared/schemas/auth";

export function ResetForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const context = useResetContext();
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });

  useEffect(() => {
    if (context === null && !done) router.replace("/forgot-password");
  }, [context, done, router]);

  const onSubmit = handleSubmit(async (values) => {
    if (!context) return;
    setFailure(null);
    try {
      await authApi.reset({ ...values, resetToken: context.resetToken });
      setDone(true);
      authFlow.setReset(null);
      router.replace("/login?notice=passwordUpdated");
    } catch (error) {
      setFailure(error);
    }
  });

  return (
    <AuthLayout
      title={t("resetTitle")}
      subtitle={context ? t("resetSubtitle", { email: context.maskedEmail }) : " "}
    >
      {!context ? (
        <div className="mt-16 flex justify-center text-brand">
          <Spinner className="size-6" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
          {failure != null && <Banner tone="error" title={errorText(failure)} />}
          <Field label={t("newPassword")} htmlFor="password" size="lg" error={fieldError(errors.password?.message)}>
            <PasswordInput id="password" autoComplete="new-password" controlSize="lg" invalid={!!errors.password} {...register("password")} />
          </Field>
          <Field label={t("confirmNewPassword")} htmlFor="confirmPassword" size="lg" error={fieldError(errors.confirmPassword?.message)}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" controlSize="lg" invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-1">
            {t("updatePassword")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
