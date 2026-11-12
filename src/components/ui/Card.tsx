import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** White surface with the thin border and 12px radius used across the app. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-white", className)} {...rest} />;
}

export function PageTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
