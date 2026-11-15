import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle: ReactNode;
  /** The register card is taller and has no reserved minimum height. */
  compact?: boolean;
  children: ReactNode;
};

/**
 * Shared frame of the five authentication screens: the pickleball-court
 * illustration fills the viewport and a white card sits in the centre.
 */
export function AuthLayout({ title, subtitle, compact = false, children }: Props) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#2f7a38] bg-[url('/images/auth-bg.jpg')] bg-cover bg-center px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[#10491d]/25" />
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageSwitcher tone="dark" />
      </div>
      <main
        className={cn(
          "relative z-10 w-full max-w-[654px] rounded-[20px] bg-white p-6 sm:p-10",
          !compact && "sm:min-h-[610px]",
        )}
      >
        <h1 className="text-[26px] font-semibold leading-tight text-ink sm:text-[32px]">{title}</h1>
        <div className="mt-2.5 text-sm text-muted sm:text-[15px]">{subtitle}</div>
        {children}
      </main>
    </div>
  );
}
