"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { bookingStatusKey, paymentStatusKey, type BookingStatus, type PaymentStatus } from "@/i18n/status";

export type BadgeTone = "green" | "amber" | "red" | "gray";

const tones: Record<BadgeTone, string> = {
  green: "bg-brand-soft text-brand",
  amber: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-danger",
  gray: "bg-[#eef1ee] text-subtle",
};

export function Badge({ tone, children, className }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none", tones[tone], className)}>
      {children}
    </span>
  );
}

const bookingTone: Record<BookingStatus, BadgeTone> = {
  "Chờ xác nhận": "amber",
  "Đã xác nhận": "green",
  "Đã hoàn tất": "gray",
  "Đã hủy": "red",
  "Đã hủy – hoàn tiền": "gray",
};
const paymentTone: Record<PaymentStatus, BadgeTone> = {
  "Chờ thanh toán": "amber",
  "Đã thanh toán": "green",
  "Thanh toán không hợp lệ": "red",
  "Chờ hoàn tiền": "amber",
  "Đã hoàn tiền": "amber",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("status");
  return <Badge tone={bookingTone[status] ?? "gray"}>{t(bookingStatusKey[status])}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = useTranslations("status");
  return <Badge tone={paymentTone[status] ?? "gray"}>{t(paymentStatusKey[status])}</Badge>;
}
