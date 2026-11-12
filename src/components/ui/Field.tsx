import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Small note on the right of the label, e.g. "Read only". */
  aside?: ReactNode;
  size?: "lg" | "md";
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error, used by every form in the system. */
export function Field({ label, htmlFor, required, error, hint, aside, size = "md", className, children }: Props) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className={cn("font-medium text-ink", size === "lg" ? "text-sm" : "text-xs")}
        >
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
        {aside && <span className="text-[11px] text-subtle">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
