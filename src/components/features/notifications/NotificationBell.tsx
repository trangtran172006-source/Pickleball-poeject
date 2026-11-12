"use client";

import { Bell, CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { usePopover } from "@/components/ui/DatePicker";
import { useFormat } from "@/i18n/useFormat";
import { notificationsApi } from "@/services/api/customer";
import type { AppNotification } from "@/shared/types";

type Props = { tone?: "light" | "dark"; bookingHref: (bookingId: string) => string };

/** Bell with unread count; opens the "New notifications" box from the design. */
export function NotificationBell({ tone = "light", bookingHref }: Props) {
  const t = useTranslations("notifications");
  const tn = useTranslations("nav");
  const f = useFormat();
  const router = useRouter();
  const client = useQueryClient();
  const { open, setOpen, ref } = usePopover();
  const feed = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.feed, refetchInterval: 60_000 });
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = feed.data?.unread ?? 0;

  const text = (item: AppNotification) => {
    const params = { ...item.params } as Record<string, string | number>;
    if (typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) params.date = f.date(params.date);
    if (typeof params.amount === "number") params.amount = f.currency(params.amount);
    return t(item.type, params as never);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={tn("notifications")}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) markRead.mutate();
        }}
        className={cn("relative flex size-9 items-center justify-center rounded-full", tone === "dark" ? "text-white hover:bg-white/10" : "text-body hover:bg-page")}
      >
        <Bell aria-hidden className="size-[18px]" strokeWidth={1.75} />
        {unread > 0 && (
          <span data-unread className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={t("title")} className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,360px)] rounded-xl border border-line bg-white p-4 text-left shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
            <span className="text-[11px] font-medium text-brand">{t("count", { count: unread })}</span>
          </div>
          {feed.isPending ? (
            <div className="h-16 animate-pulse rounded-lg bg-page" />
          ) : !feed.data || feed.data.items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">{t("empty")}</p>
          ) : (
            <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
              {feed.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!item.bookingId}
                    onClick={() => {
                      setOpen(false);
                      if (item.bookingId) router.push(bookingHref(item.bookingId));
                    }}
                    className={cn("flex w-full items-start gap-2.5 rounded-lg border border-line p-3 text-left hover:bg-page", !item.read && "bg-brand-soft/60")}
                  >
                    <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.75} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">{text(item)}</span>
                      <span className="mt-1 block text-[10px] text-subtle">{f.dateTime(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
