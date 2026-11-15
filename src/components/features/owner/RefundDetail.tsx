"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, Check, FileImage } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { useFormat } from "@/i18n/useFormat";
import { refundApi } from "@/services/api/owner";
import { uploadToSignedUrl } from "@/services/api/customer";
import type { RefundDetail as RefundDetailData, RefundResult } from "@/shared/types";

type Phase = "review" | "record" | "done";

/** UI_52→56 – review a cancelled booking, record the refund with proof, show the result (UC_4.2). */
export function RefundDetail({ id }: { id: string }) {
  const t = useTranslations("refund");
  const tc = useTranslations("common");
  const f = useFormat();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const detail = useQuery({ queryKey: ["refund", id], queryFn: () => refundApi.detail(id) });

  const [phase, setPhase] = useState<Phase>("review");
  const [cause, setCause] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<RefundResult | null>(null);

  const r = detail.data;
  const causeVal = cause ?? r?.cause ?? "";
  const choiceVal = choice ?? r?.customerChoice ?? "";

  const start = useMutation({
    mutationFn: () =>
      refundApi.request(id, {
        cause: (causeVal || "Sân đóng cửa").trim(),
        customerChoice: (choiceVal || "Không muốn dời lịch, yêu cầu hoàn tiền").trim(),
      }),
    onSuccess: () => setPhase("record"),
    onError: (error) => toast.show("error", errorText(error, "errors.refundStartFailed")),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!proof) throw new Error("proof");
      const ticket = await refundApi.proofUploadUrl(id, proof);
      const path = await uploadToSignedUrl(ticket, proof);
      const res = await refundApi.confirm(id, path);
      return {
        ...res,
        proofName: proof.name || res.proofName,
        proofSize: proof.size || res.proofSize,
      };
    },
    onSuccess: (res) => {
      setConfirmOpen(false);
      setResult(res);
      setPhase("done");
      void client.invalidateQueries({ queryKey: ["refund-bookings"] });
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.show("error", errorText(error, "errors.refundConfirmFailed"));
    },
  });

  if (detail.isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (detail.isError || !r) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const alreadyRefunded = r.refundStatus === "Đã hoàn tiền";

  if (phase === "done" && result) {
    return <ResultView result={result} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={phase === "record" ? t("title") : t("detailTitle")}
        subtitle={phase === "record" ? t("sub", { code: r.code }) : t("detailSub")}
      />

      <BookingInfoCard data={r} />

      {phase === "review" ? (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-medium text-ink">{t("cancelInfo")}</h2>
            {alreadyRefunded ? (
              <Banner tone="success" className="mt-4" title={t("refundDone")} />
            ) : !r.eligible ? (
              <Banner tone="info" className="mt-4" title={t("notEligible")} />
            ) : (
              <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
                <Field label={t("cause")} htmlFor="cause">
                  <Textarea
                    id="cause"
                    rows={2}
                    value={causeVal}
                    onChange={(event) => setCause(event.target.value)}
                    placeholder={t("causePlaceholder")}
                    maxLength={300}
                  />
                </Field>
                <Field label={t("choice")} htmlFor="choice">
                  <Input
                    id="choice"
                    value={choiceVal}
                    onChange={(event) => setChoice(event.target.value)}
                    placeholder={t("choicePlaceholder")}
                    maxLength={200}
                  />
                </Field>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="neutral"
              className="h-10 px-4"
              onClick={() => router.push("/owner/refunds")}
              iconLeft={<ArrowLeft aria-hidden className="size-4 text-subtle" />}
            >
              {t("backToList")}
            </Button>
            {!alreadyRefunded && r.eligible && (
              <Button
                className="h-10 px-6"
                loading={start.isPending}
                onClick={() => start.mutate()}
                data-start-refund
              >
                {t("refundButton")}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-medium text-ink">
              {t("proofTitle")} <span className="text-danger">*</span>
            </h2>
            <p className="mb-4 mt-1.5 text-xs text-muted">{t("proofSub")}</p>
            <ImageDropzone
              file={proof}
              onChange={(file) => {
                setProof(file);
                setProofError(null);
              }}
              hint={t("dropHint")}
              buttonLabel={t("uploadButton")}
              error={proofError ?? undefined}
            />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-subtle">{t("onlyAfter", { amount: f.currency(r.paid) })}</p>
            <div className="flex items-center gap-2.5">
              {proof && (
                <Button variant="neutral" className="h-10 px-5" onClick={() => setPhase("review")}>
                  {tc("cancel")}
                </Button>
              )}
              <Button
                className="h-10 px-6"
                disabled={!proof}
                onClick={() => {
                  if (!proof) {
                    setProofError(tc("required"));
                    return;
                  }
                  setConfirmOpen(true);
                }}
                data-confirm-refund
              >
                {tc("confirm")}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirm.mutate()}
        loading={confirm.isPending}
        showClose
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        title={t("confirmTitle")}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Banknote aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
        }
      >
        <dl className="rounded-lg bg-page px-4 py-3 text-xs">
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-muted">{t("orderCode")}</dt>
            <dd className="font-semibold text-ink">{r.code}</dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-muted">{t("refundedAmount")}</dt>
            <dd className="text-sm font-semibold text-brand">{f.currency(r.paid)}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </div>
  );

  function BookingInfoCard({ data }: { data: RefundDetailData }) {
    return (
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-medium text-ink">{t("bookingInfo")}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <p className="text-lg font-semibold text-ink">{data.code}</p>
          <PaymentStatusBadge status={data.refundStatus} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoCell label={t("bookerName")} value={data.bookerName} />
          <InfoCell label={t("bookerPhone")} value={data.bookerPhone} />
          <InfoCell label={t("bookedAt")} value={f.dateTime(data.createdAt)} />
          <InfoCell label={tc("court")} value={data.courtName} />
          <InfoCell label={t("playDate")} value={f.date(data.date)} />
          <InfoCell label={t("slot")} value={f.timeRange(data.start, data.end)} />
        </dl>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-soft px-4 py-3.5">
          <div>
            <p className="text-xs font-medium text-ink">{t("totalPaid")}</p>
            <p className="mt-0.5 text-[11px] text-brand">{t("paidFull")}</p>
          </div>
          <p className="text-2xl font-semibold text-brand">{f.currency(data.paid)}</p>
        </div>
      </Card>
    );
  }

  function ResultView({ result }: { result: RefundResult }) {
    const slotDesc = [result.courtName, f.date(result.date), f.timeRange(result.start, result.end)].filter(Boolean).join(" · ");
    const updates = [
      { title: t("u1"), desc: t("u1d", { amount: f.currency(result.amount) }) },
      { title: t("u2"), desc: slotDesc ? `${slotDesc}.` : "" },
      { title: t("u3"), desc: t("u3d") },
      { title: t("u4"), desc: t("u4d") },
    ];
    return (
      <div className="flex flex-col gap-5" data-refund-done>
        <PageTitle title={t("resultTitle")} subtitle={t("resultSub", { code: result.code })} />

        <Card className="px-5 py-7 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Check aria-hidden className="size-5" strokeWidth={2.25} />
          </span>
          <h2 className="mt-3.5 text-xl font-semibold text-ink">{t("success")}</h2>
          <p className="mt-1.5 text-xs text-muted">
            {t("successDesc", { amount: f.currency(result.amount), name: result.bookerName })}
          </p>
          <div className="mt-3 flex justify-center">
            <BookingStatusBadge status="Đã hủy – hoàn tiền" />
          </div>
        </Card>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Card className="p-5 sm:p-6">
              <h3 className="text-base font-medium text-ink">{t("recorded")}</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoCell label={t("orderCode")} value={result.code} />
                <InfoCell label={t("bookerName")} value={result.bookerName} />
                <InfoCell label={t("bookerPhone")} value={result.bookerPhone} />
                <InfoCell label={t("courtDate")} value={`${result.courtName} · ${f.date(result.date)}`} />
                <InfoCell label={t("slot")} value={f.timeRange(result.start, result.end)} />
                <InfoCell label={t("refundedAmount")} value={f.currency(result.amount)} />
              </dl>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="text-base font-medium text-ink">{t("proof")}</h3>
              <div className="mt-4 rounded-xl border border-line bg-page p-4">
                <div className="flex items-center justify-between text-[11px] text-subtle">
                  <span>{t("proofSample")}</span>
                  <FileImage aria-hidden className="size-4 text-subtle" strokeWidth={1.5} />
                </div>
                <p className="mt-2.5 text-xs font-semibold text-ink">{t("refundDone")}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted">
                    {result.bookerName} · {result.code}
                  </span>
                  <span className="text-xs font-semibold text-brand">{f.currency(result.amount)}</span>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-subtle">
                {result.proofName}
                {result.proofSize > 0 ? ` · ${f.fileSize(result.proofSize)}` : ""}
              </p>
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <h3 className="text-base font-medium text-ink">{t("updatesDone")}</h3>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {updates.map((u, i) => (
                <li key={i} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
                  <div>
                    <p className="text-xs font-semibold text-ink">{u.title}</p>
                    {u.desc && <p className="mt-1 text-[11px] text-muted">{u.desc}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-10 px-5"
            onClick={() => router.push("/owner/refunds")}
            iconLeft={<ArrowLeft aria-hidden className="size-4" />}
          >
            {t("backToList")}
          </Button>
        </div>
      </div>
    );
  }
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="mt-1 text-xs font-semibold text-ink">{value}</dd>
    </div>
  );
}
