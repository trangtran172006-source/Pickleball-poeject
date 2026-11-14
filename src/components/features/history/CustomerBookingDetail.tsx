"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight, RotateCcw, TriangleAlert } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { closureReasonKey } from "@/i18n/status";
import { bookingsApi } from "@/services/api/customer";
import type { BookingDetail } from "@/shared/types";
import { BookingDetailView } from "./BookingDetailView";

/** UI khách: khi sân bị đóng, khách chọn Hoàn tiền hoặc Dời lịch (A1). */
export function CustomerBookingDetail({ id }: { id: string }) {
  const t = useTranslations("history");
  const ts = useTranslations("status");
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const choose = useMutation({
    mutationFn: (choice: "Hoàn tiền" | "Dời lịch") => bookingsApi.handleClosure(id, choice),
    onSuccess: () => { toast.show("success", t("choiceSaved")); void client.invalidateQueries(); },
    onError: (error) => toast.show("error", errorText(error)),
  });

  const closure = (d: BookingDetail): ReactNode => {
    if (!d.affectedReason) return null;
    const active = d.status === "Chờ xác nhận" || d.status === "Đã xác nhận";
    if (!active) return null;
    if (d.closureChoice === "Hoàn tiền") return <Notice>{t("choiceRefundMade")}</Notice>;
    if (d.closureChoice === "Dời lịch") return <Notice>{t("choiceRescheduleMade")}</Notice>;
    return (
      <div className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3.5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-warn">
          <TriangleAlert aria-hidden className="size-4" strokeWidth={1.75} />
          {t("closureNoticeTitle")}
        </p>
        <p className="mt-1.5 text-xs text-body">{t("closureNoticeDesc", { reason: ts(closureReasonKey[d.affectedReason]) })}</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Button onClick={() => choose.mutate("Dời lịch")} loading={choose.isPending} iconLeft={<ArrowLeftRight aria-hidden className="size-4" />}>
            {t("chooseReschedule")}
          </Button>
          <Button variant="neutral" onClick={() => choose.mutate("Hoàn tiền")} loading={choose.isPending} iconLeft={<RotateCcw aria-hidden className="size-4" />}>
            {t("chooseRefund")}
          </Button>
        </div>
      </div>
    );
  };

  return <BookingDetailView id={id} extra={closure} />;
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-page px-4 py-3 text-xs text-body">{children}</div>;
}
