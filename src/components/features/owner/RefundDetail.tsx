"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Banknote, Bell, CircleCheck, Landmark, Megaphone, TrendingUp, Upload } from "lucide-react";
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
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { useFormat } from "@/i18n/useFormat";
import { refundApi } from "@/services/api/owner";
import { uploadToSignedUrl } from "@/services/api/customer";
import type { RefundResult } from "@/shared/types";

type Phase = "review" | "record" | "done";

/** UI_52→56 – review a cancelled booking, record the refund with proof, show the result (UC_20.2…20.5). */
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
  const [cause, setCause] = useState("");
  const [choice, setChoice] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<RefundResult | null>(null);

  const start = useMutation({
    mutationFn: () => refundApi.request(id, { cause: cause.trim(), customerChoice: choice.trim() }),
    onSuccess: () => setPhase("record"),
    onError: (error) => toast.show("error", errorText(error, "errors.refundStartFailed")),
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!proof) throw new Error("proof");
      const ticket = await refundApi.proofUploadUrl(id, proof);
      const path = await uploadToSignedUrl(ticket, proof);
      return refundApi.confirm(id, path);
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
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const r = detail.data;
  const alreadyRefunded = r.refundStatus === "Đã hoàn tiền";

  return (
    <div>
      <button type="button" onClick={() => router.push("/owner/refunds")} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {t("backToList")}
      </button>

      {phase === "done" && result ? (
        <ResultView result={result} />
      ) : (
        <>
          <PageTitle
            title={phase === "record" ? t("title") : t("detailTitle")}
            subtitle={phase === "record" ? t("sub", { code: r.code }) : t("detailSub")}
            action={<PaymentStatusBadge status={r.refundStatus} />}
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <Landmark aria-hidden className="size-4 text-brand" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-ink">{t("bookingInfo")}</h2>
              </div>
              <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                <Row label={t("orderCode")} value={r.code} />
                <Row label={t("courtDate")} value={`${r.courtName} · ${f.date(r.date)}`} />
                <Row label={tc("time")} value={`${r.start} – ${r.end}`} />
                <Row label={t("bookerName")} value={r.bookerName} />
                <Row label={t("bookerPhone")} value={r.bookerPhone} />
                <Row label={t("totalPaid")} value={f.currency(r.paid)} strong />
              </dl>
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-3.5 py-2.5 text-[11px] text-brand">
                <CircleCheck aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                {t("paidFull")}
              </p>
            </Card>

            {phase === "review" ? (
              <Card className="h-fit p-5 sm:p-6 lg:sticky lg:top-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">{t("cancelInfo")}</h2>
                {alreadyRefunded ? (
                  <Banner tone="success" title={t("refundDone")} />
                ) : !r.eligible ? (
                  <Banner tone="info" title={t("notEligible")} />
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      start.mutate();
                    }}
                    className="flex flex-col gap-4"
                  >
                    <Field label={t("cause")} htmlFor="cause" required>
                      <Textarea id="cause" rows={2} value={cause || r.cause || ""} onChange={(event) => setCause(event.target.value)} placeholder={t("causePlaceholder")} maxLength={300} />
                    </Field>
                    <Field label={t("choice")} htmlFor="choice" required>
                      <Input id="choice" value={choice || r.customerChoice || ""} onChange={(event) => setChoice(event.target.value)} placeholder={t("choicePlaceholder")} maxLength={200} />
                    </Field>
                    <Button type="submit" loading={start.isPending} iconLeft={<Banknote aria-hidden className="size-4" />} data-start-refund>
                      {t("refundButton")}
                    </Button>
                  </form>
                )}
              </Card>
            ) : (
              <Card className="h-fit p-5 sm:p-6 lg:sticky lg:top-6">
                <div className="mb-1 flex items-center gap-2.5">
                  <Upload aria-hidden className="size-4 text-brand" strokeWidth={1.75} />
                  <h2 className="text-sm font-semibold text-ink">{t("proofTitle")}</h2>
                </div>
                <p className="mb-4 text-[11px] text-muted">{t("proofSub")}</p>
                <Field label={t("proof")} htmlFor="refund-proof" required error={proofError ?? undefined}>
                  <ImageDropzone file={proof} onChange={(file) => { setProof(file); setProofError(null); }} hint={t("dropHint")} buttonLabel={t("uploadButton")} />
                </Field>
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-soft px-3.5 py-2.5 text-[11px] text-amber-700">
                  <Banknote aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
                  {t("onlyAfter", { amount: f.currency(r.paid) })}
                </p>
                <Button
                  className="mt-5 w-full"
                  onClick={() => {
                    if (!proof) { setProofError(tc("required")); return; }
                    setConfirmOpen(true);
                  }}
                  iconLeft={<CircleCheck aria-hidden className="size-4" />}
                  data-confirm-refund
                >
                  {t("confirmTitle")}
                </Button>
              </Card>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirm.mutate()}
        loading={confirm.isPending}
        confirmLabel={t("confirmTitle")}
        title={t("confirmTitle")}
        icon={<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Banknote aria-hidden className="size-[18px]" strokeWidth={1.75} /></span>}
      >
        <dl className="rounded-lg bg-page px-4 py-3 text-xs">
          <div className="flex items-center justify-between py-1">
            <dt className="text-muted">{t("orderCode")}</dt>
            <dd className="font-medium text-ink">{r.code}</dd>
          </div>
          <div className="flex items-center justify-between py-1">
            <dt className="text-muted">{t("refundedAmount")}</dt>
            <dd className="font-semibold text-brand">{f.currency(r.paid)}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </div>
  );

  function ResultView({ result }: { result: RefundResult }) {
    const updates = [
      { icon: CircleCheck, title: t("u1"), desc: t("u1d", { amount: f.currency(result.amount) }) },
      { icon: Bell, title: t("u2"), desc: "" },
      { icon: Megaphone, title: t("u3"), desc: t("u3d") },
      { icon: TrendingUp, title: t("u4"), desc: t("u4d") },
    ];
    return (
      <>
        <PageTitle title={t("resultTitle")} subtitle={t("resultSub", { code: result.code })} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-xl bg-brand-soft px-4 py-3.5">
              <BadgeCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-brand">{t("success")}</p>
                <p className="mt-0.5 text-xs text-brand/90">{t("successDesc", { amount: f.currency(result.amount), name: result.bookerName })}</p>
              </div>
            </div>
            <h3 className="mb-3 mt-6 text-sm font-semibold text-ink">{t("updatesDone")}</h3>
            <ul className="flex flex-col gap-3">
              {updates.map((u, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <u.icon aria-hidden className="size-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-ink">{u.title}</p>
                    {u.desc && <p className="mt-0.5 text-[11px] text-muted">{u.desc}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="h-fit p-5 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold text-ink">{t("recorded")}</h3>
            <dl className="flex flex-col gap-3">
              <Row label={t("orderCode")} value={result.code} />
              <Row label={t("courtDate")} value={`${result.courtName} · ${f.date(result.date)}`} />
              <Row label={t("refundedAmount")} value={f.currency(result.amount)} strong />
              <Row label={t("proof")} value={result.proofName} />
            </dl>
            <Button variant="neutral" className="mt-5 w-full" onClick={() => router.push("/owner/refunds")}>
              {t("backToList")}
            </Button>
          </Card>
        </div>
      </>
    );
  }
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className={strong ? "mt-1 text-sm font-semibold text-brand" : "mt-1 text-xs text-body"}>{value}</dd>
    </div>
  );
}
