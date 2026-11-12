"use client";

import type { ReactNode } from "react";
import { CircleAlert, Inbox, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { Button } from "./Button";

/** Grey shimmering placeholder shown while data is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-[#e9eeea]", className)} />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  const t = useTranslations("common");
  return (
    <div role="status" aria-label={t("loading")} className={cn("flex flex-col gap-3 p-5", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, icon, children, className }: { title: ReactNode; icon?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div data-state="empty" className={cn("flex flex-col items-center justify-center gap-3 px-4 py-14 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-page text-subtle">
        {icon ?? <Inbox aria-hidden className="size-5" strokeWidth={1.5} />}
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useTranslations("common");
  const errorText = useApiErrorMessage();
  return (
    <div data-state="error" className={cn("p-5", className)}>
      <div role="alert" className="flex items-center gap-2.5 rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger">
        <CircleAlert aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
        {errorText(error)}
      </div>
      {onRetry && (
        <Button className="mt-3" onClick={onRetry} iconLeft={<RotateCw aria-hidden className="size-4" />}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
