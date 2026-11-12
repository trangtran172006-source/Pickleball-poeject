import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "outline" | "neutral" | "danger" | "ghost";
type Size = "lg" | "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  outline: "border border-brand bg-white text-brand hover:bg-brand-soft",
  neutral: "border border-line bg-white text-ink hover:bg-page",
  danger: "border border-danger-line bg-danger-soft text-danger hover:bg-danger-line/40",
  ghost: "text-brand hover:bg-brand-soft",
};

const sizes: Record<Size, string> = {
  lg: "h-[52px] rounded-[10px] px-5 text-[15px]",
  md: "h-10 rounded-lg px-4 text-[13px]",
  sm: "h-8 rounded-md px-3 text-xs",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span className="min-w-0 truncate">{children}</span>
      {!loading && iconRight}
    </button>
  );
}
