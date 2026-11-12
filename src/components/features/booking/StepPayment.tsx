"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, CreditCard, Info, QrCode, ShieldCheck, Timer, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { useFormat } from "@/i18n/useFormat";
import { ApiError } from "@/services/api/client";
import { bookingsApi, uploadToSignedUrl } from "@/services/api/customer";
import { mmss, useCountdown } from "@/components/features/auth/useCountdown";
import { BookingSummaryCard } from "./BookingSummaryCard";
import { SupportCard } from "./StepInfo";
import type { StepProps } from "./types";
import { VenueCard } from "./VenueCard";

/** Step 3 – bank transfer by VietQR and upload of the payment proof (UI_15/17/28/29). */
export function StepPayment({ mode, state, update }: StepProps) {
  const t = useTranslations("payment");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const hold = state.hold!;
  const [file, setFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const left = useCountdown(hold.expiresAt);
  const expiredHandled = useRef(false);
  const info = useQuery({ queryKey: ["payment-info", hold.bookingId], queryFn: () => bookingsApi.paymentInfo(hold.bookingId), retry: false });

  const backToInfo = useCallback(() => {
    void client.invalidateQueries({ queryKey: ["schedule"] });
    update({ step: 1, hold: null });
  }, [client, update]);

  // UC_2.1 BR06: the slot is held for 5 minutes only.
  useEffect(() => {
    if (left > 0 || expiredHandled.current) return;
    expiredHandled.current = true;
    toast.show("error", te("holdExpired"));
    bookingsApi.release(hold.bookingId).catch(() => undefined);
    backToInfo();
  }, [left, hold.bookingId, toast, te, backToInfo]);

  const release = useMutation({
    mutationFn: () => bookingsApi.release(hold.bookingId),
    onSettled: backToInfo,
  });

  const pay = useMutation({
    mutationFn: async (proof: File) => {
      const ticket = await bookingsApi.proofUploadUrl(hold.bookingId, proof);
      const path = await uploadToSignedUrl(ticket, proof);
      return bookingsApi.confirmPayment(hold.bookingId, path);
    },
    onSuccess: (detail) => {
      void client.invalidateQueries();
      update({ step: 3, done: detail, hold: null });
    },
    onError: (error) => {
      if (error instanceof ApiError && ["HOLD_EXPIRED", "PAYMENT_INVALID", "BOOKING_NOT_FOUND"].includes(error.code)) {
        expiredHandled.current = true;
        toast.show("error", errorText(error, "errors.paymentInvalid"));
        backToInfo();
      } else setFailure(error);
    },
  });

  const submit = () => {
    setFailure(null);
    if (!file) return setProofError(true);
    pay.mutate(file);
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      toast.show("success", tc("copied"));
    } catch {
      /* clipboard not available */
    }
  };

  const methods = [
    { key: "transfer", icon: QrCode, title: t("transfer"), sub: t("transferSub"), enabled: true },
    { key: "wallet", icon: Wallet, title: t("wallet"), sub: "MoMo / ZaloPay", enabled: false },
    { key: "card", icon: CreditCard, title: t("card"), sub: "ATM / Visa / Mastercard", enabled: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div role="timer" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-5 py-3.5 text-brand">
        <div className="flex items-center gap-3">
          <Timer aria-hidden className="size-5" strokeWidth={1.5} />
          <div>
            <p className="text-[13px] font-semibold">{t("holdTitle")}</p>
            <p className="mt-0.5 text-[11px]">{t("holdSub")}</p>
          </div>
        </div>
        <p className="text-2xl font-semibold tabular-nums" data-countdown>
          {mmss(left)} <span className="text-[11px] font-normal">/ 05:00</span>
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex min-w-0 flex-col gap-5">
          {mode === "customer" && <VenueCard />}
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-medium text-ink">{t("methodTitle")}</h2>
            <p className="mt-1.5 text-xs text-muted">{t("methodSub")}</p>
            <div role="radiogroup" aria-label={t("methodTitle")} className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {methods.map((method) => (
                <div
                  key={method.key}
                  role="radio"
                  aria-checked={method.enabled}
                  aria-disabled={!method.enabled}
                  data-method={method.key}
                  title={method.enabled ? undefined : tc("notSupported")}
                  className={cn(
                    "flex h-[66px] items-center gap-3 rounded-lg border px-3.5",
                    method.enabled ? "border-brand bg-brand-soft" : "cursor-not-allowed border-line bg-white opacity-60",
                  )}
                >
                  <method.icon aria-hidden className={cn("size-5 shrink-0", method.enabled ? "text-brand" : "text-subtle")} strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{method.title}</span>
                    <span className="block truncate text-[10px] text-subtle">{method.enabled ? method.sub : `${method.sub} · ${tc("notSupported")}`}</span>
                  </span>
                  <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", method.enabled ? "border-brand" : "border-[#c9d2cb]")}>
                    {method.enabled && <span className="size-2 rounded-full bg-brand" />}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-line pt-5">
              {info.isPending ? (
                <div role="status" className="grid gap-5 sm:grid-cols-[170px_1fr]">
                  <Skeleton className="h-[170px]" />
                  <Skeleton className="h-[170px]" />
                </div>
              ) : info.isError ? (
                <ErrorState error={info.error} onRetry={() => info.refetch()} className="px-0" />
              ) : (
                <div className="grid gap-6 sm:grid-cols-[170px_1fr]">
                  <div className="mx-auto text-center">
                    <p className="text-sm font-semibold text-brand">VIETQR</p>
                    <div className="mt-2 rounded-lg border border-line p-2.5">
                      <QRCodeSVG value={info.data.qrPayload} size={148} level="M" data-qr />
                    </div>
                    <p className="mt-2 text-[10px] text-subtle">{t("qrCaption")}</p>
                  </div>
                  <div className="min-w-0">
                    <Badge tone="green" className="rounded-md px-2.5 py-1.5 text-xs">
                      {t("bankTransfer")}
                    </Badge>
                    <dl className="mt-4 flex flex-col gap-4 text-[13px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-subtle">{t("bank")}</dt>
                        <dd className="text-right text-ink">{info.data.bank.name}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-subtle">{t("holder")}</dt>
                        <dd className="text-right text-ink">{info.data.bank.holder}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-subtle">{t("account")}</dt>
                        <dd className="flex items-center gap-2 font-semibold text-ink">
                          {info.data.bank.account}
                          <button type="button" onClick={() => copy(info.data.bank.account)} aria-label={tc("copy")} className="text-brand">
                            <Copy aria-hidden className="size-3.5" />
                          </button>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-subtle">{t("content")}</dt>
                        <dd className="flex items-center gap-2 font-semibold text-ink">
                          <span className="[overflow-wrap:anywhere]">{info.data.bank.content}</span>
                          <button type="button" onClick={() => copy(info.data.bank.content)} aria-label={tc("copy")} className="text-brand">
                            <Copy aria-hidden className="size-3.5" />
                          </button>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-line pt-4">
                        <dt className="text-subtle">{t("transferAmount")}</dt>
                        <dd className="font-semibold text-ink" data-amount>
                          {f.currency(info.data.amount)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
              <p className="mt-5 flex items-start gap-2.5 rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand">
                <Info aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
                {t("guide")}
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-ink">{t("proofTitle")}</h2>
            <p className="mb-4 mt-1.5 text-xs text-muted">{t("proofSub")}</p>
            <ImageDropzone
              file={file}
              disabled={pay.isPending}
              error={proofError && !file ? tv("proofRequired") : undefined}
              onChange={(next) => {
                setFile(next);
                setProofError(false);
              }}
            />
            {failure != null && (
              <p role="alert" className="mt-3 text-xs text-danger">
                {errorText(failure)}
              </p>
            )}
          </Card>

          <p className="flex items-center gap-2 text-[11px] text-subtle">
            <ShieldCheck aria-hidden className="size-3.5" strokeWidth={1.5} />
            {t("secure")}
          </p>
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="neutral" className="h-[46px] px-5" onClick={() => release.mutate()} loading={release.isPending} disabled={pay.isPending} iconLeft={<ArrowLeft aria-hidden className="size-4 text-subtle" />}>
              {mode === "staff" ? tc("back") : t("backToInfo")}
            </Button>
            <Button className="h-[46px] px-6" onClick={submit} loading={pay.isPending} iconRight={<ArrowRight aria-hidden className="size-4" />} data-pay>
              {t("confirmPaid")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <BookingSummaryCard selection={state.selection} />
          <Card className="px-5 py-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink">
              <ShieldCheck aria-hidden className="size-4 text-brand" strokeWidth={1.5} />
              {t("verifyTitle")}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">{t("verifySub")}</p>
          </Card>
          <SupportCard />
        </div>
      </div>
    </div>
  );
}
