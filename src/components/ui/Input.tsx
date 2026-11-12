import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ControlSize = "lg" | "mid" | "md";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  invalid?: boolean;
  controlSize?: ControlSize;
  left?: ReactNode;
  right?: ReactNode;
};

export const controlBase =
  "w-full border bg-white text-ink placeholder:text-subtle/80 outline-none transition-colors " +
  "focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-page disabled:text-muted";
export const controlSizes: Record<ControlSize, string> = {
  lg: "h-[52px] rounded-[10px] px-4 text-sm",
  mid: "h-[46px] rounded-[10px] px-4 text-sm",
  md: "h-10 rounded-lg px-3 text-[13px]",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, controlSize = "md", left, right, className, id, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {left && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">{left}</span>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && id ? `${id}-error` : undefined}
        className={cn(
          controlBase,
          "read-only:bg-page read-only:text-muted",
          controlSizes[controlSize],
          invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line",
          !!left && "pl-9",
          !!right && "pr-11",
          className,
        )}
        {...rest}
      />
      {right && <span className="absolute inset-y-0 right-2 flex items-center">{right}</span>}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, id, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(
        controlBase,
        "min-h-[88px] resize-y rounded-lg px-3 py-2.5 text-[13px] leading-relaxed",
        invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});
