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
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { authFlow, useOtpContext } from "@/lib/authFlow";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/services/api/client";
import { otpSchema, type OtpInput } from "@/shared/schemas/auth";
import { AuthFooter } from "./AuthFooter";
import { mmss, useCountdown } from "./useCountdown";

export function OtpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const context = useOtpContext();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<{ error: unknown } | "resent" | null>(null);
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);
  const wait = useCountdown(context?.resendAvailableAt);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OtpInput>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });

  useEffect(() => {
    if (context === null && !done) router.replace("/login");
  }, [context, done, router]);

  const onSubmit = handleSubmit(async ({ code }) => {
    if (!context) return;
    setMessage(null);
    try {
      const result = await authApi.verifyOtp({ email: context.email, purpose: context.purpose, code: code.trim() });
      setDone(true);
      authFlow.setOtp(null);
      if (context.purpose === "reset" && result.resetToken) {
        authFlow.setReset({ resetToken: result.resetToken, maskedEmail: context.maskedEmail });
        router.replace("/reset-password");
      } else {
        router.replace("/login?notice=registered");
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === "OTP_TOO_MANY" || error.code === "OTP_EXPIRED")) setLocked(true);
      setMessage({ error });
    }
  });

  const resend = async () => {
    if (!context) return;
    setMessage(null);
    setResending(true);
    try {
      const challenge = await authApi.resendOtp({ email: context.email, purpose: context.purpose });
      authFlow.setOtp({ ...context, ...challenge });
      setLocked(false);
      reset({ code: "" });
      setMessage("resent");
    } catch (error) {
      setMessage({ error });
    } finally {
      setResending(false);
    }
  };

  if (!context) {
    return (
      <AuthLayout title={t("otpTitle")} subtitle={t("otpSent")}>
        <div className="mt-16 flex justify-center text-brand">
          <Spinner className="size-6" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("otpTitle")}
      subtitle={
        <>
          {t("otpSent")}
          <strong className="block font-semibold text-ink [overflow-wrap:anywhere]">{context.maskedEmail}</strong>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {message === "resent" && <Banner tone="success" title={t("otpResent")} />}
        {message && message !== "resent" && <Banner tone="error" title={errorText(message.error)} />}
        <Field label={t("otpLabel")} htmlFor="code" size="lg" error={fieldError(errors.code?.message)}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            controlSize="lg"
            placeholder={t("otpPlaceholder")}
            invalid={!!errors.code}
            disabled={locked}
            {...register("code")}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={locked}>
          {t("otpVerify")}
        </Button>
      </form>
      <p className="mt-7 text-center text-[13px] text-muted">{t("otpWaited")}</p>
      <Button
        variant="outline"
        size="lg"
        fullWidth
        className="mt-3"
        onClick={resend}
        loading={resending}
        disabled={wait > 0 && !locked}
      >
        {wait > 0 && !locked ? t("otpResendIn", { time: mmss(wait) }) : t("otpResend")}
      </Button>
      <AuthFooter question={t("otpChangeInfo")} href="/login" link={t("backToLogin")} />
    </AuthLayout>
  );
}
