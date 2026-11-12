import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Horizontal 4-step progress bar of the booking flow. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-stretch rounded-xl border border-line bg-white text-xs">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3.5 sm:px-5",
              index > 0 && "border-l border-line",
              index > 0 && "sm:justify-center",
              index === steps.length - 1 && "sm:justify-end",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                done || active ? "bg-brand text-white" : "bg-page text-subtle",
              )}
            >
              {done ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : index + 1}
            </span>
            <span className={cn("truncate", active ? "font-semibold text-brand" : done ? "text-brand" : "text-subtle", !active && "hidden sm:inline")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
