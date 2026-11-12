"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ImageIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { staffApi } from "@/services/api/staff";
import type { BookingDetail } from "@/shared/types";
import { BookingDetailView } from "./BookingDetailView";

/**
 * UI_32 for staff and the owner. Adds what follows from confirming bookings on
 * the uploaded proof: view the proof and, after checking the bank statement,
 * mark the payment invalid (the booking is cancelled and the slot released).
 */
export function StaffBookingDetail({ base, id }: { base: string; id: string }) {
  const t = useTranslations("payment");
  const th = useTranslations("history");
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const [rejecting, setRejecting] = useState<BookingDetail | null>(null);
  const reject = useMutation({
    mutationFn: () => staffApi.rejectPayment(id),
    onSuccess: () => {
      toast.show("success", t("rejected"));
      setRejecting(null);
      void client.invalidateQueries();
    },
    onError: (error) => {
      toast.show("error", errorText(error));
      setRejecting(null);
    },
  });

  return (
    <>
      <BookingDetailView
        id={id}
        action={
          <Link href={`${base}/bookings`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-brand hover:bg-page">
            <ArrowLeft aria-hidden className="size-4" />
            {th("backToList")}
          </Link>
        }
        extra={(detail) =>
          (detail.proofUrl || (detail.status === "Đã xác nhận" && detail.paymentStatus === "Đã thanh toán")) && (
            <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <p className="min-w-0 flex-1 text-xs text-muted">{t("byProof")}</p>
              <div className="flex flex-wrap gap-2">
                {detail.proofUrl && (
                  <a href={detail.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-xs font-semibold text-brand hover:bg-page">
                    <ImageIcon aria-hidden className="size-4" />
                    {t("viewProof")}
                  </a>
                )}
                {detail.status === "Đã xác nhận" && detail.paymentStatus === "Đã thanh toán" && (
                  <Button variant="danger" size="md" className="h-9" onClick={() => setRejecting(detail)} iconLeft={<Ban aria-hidden className="size-4" />} data-reject>
                    {t("reject")}
                  </Button>
                )}
              </div>
            </Card>
          )
        }
      />
      <ConfirmDialog open={!!rejecting} onClose={() => setRejecting(null)} onConfirm={() => reject.mutate()} loading={reject.isPending} title={t("rejectTitle")} subtitle={t("rejectDesc")} />
    </>
  );
}
