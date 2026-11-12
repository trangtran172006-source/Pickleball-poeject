"use client";

import { CalendarX, TriangleAlert } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { useFormat } from "@/i18n/useFormat";
import { bookingsApi } from "@/services/api/customer";
import type { BookingSummary } from "@/shared/types";

/** UI_11 – "Xác nhận hủy sân?" with the no-refund warning (UC_2.2). */
export function CancelDialog({ booking, onClose }: { booking: BookingSummary; onClose: () => void }) {
  const t = useTranslations("history");
  const tc = useTranslations("common");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSuccess: () => {
      toast.show("success", t("cancelled"));
      void client.invalidateQueries();
      onClose();
    },
    onError: (error) => {
      toast.show("error", errorText(error, "errors.cancelNotAllowed"));
      void client.invalidateQueries({ queryKey: ["bookings"] });
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => cancel.mutate()}
      loading={cancel.isPending}
      title={t("cancelTitle")}
      subtitle={t("cancelAsk")}
      icon={
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
          <CalendarX aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </span>
      }
    >
      <div className="rounded-lg border border-line bg-page">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[13px] font-semibold text-ink">
            {tc("appName")} · {booking.courtName}
          </p>
          <p className="mt-1 text-[11px] text-muted">{t("codeIs", { code: booking.code })}</p>
        </div>
        <div className="flex flex-col gap-2.5 px-4 py-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-body">{f.dateLong(booking.date)}</span>
            <span className="font-medium text-ink">{f.timeRange(booking.start, booking.end)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <PaymentStatusBadge status={booking.paymentStatus} />
            <span className="font-semibold text-ink">{f.currency(booking.amount)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex items-start gap-2.5 rounded-lg bg-warn-soft px-4 py-3 text-warn">
        <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold">{t("noRefundTitle")}</p>
          <p className="mt-1 text-[11px]">{t("noRefundDesc", { amount: f.currency(booking.amount) })}</p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
