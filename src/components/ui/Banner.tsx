import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info" | "warn";

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  success: { box: "border-brand/50 bg-brand-soft text-brand", icon: CircleCheck },
  error: { box: "border-danger-line bg-danger-soft text-danger", icon: CircleX },
  info: { box: "border-transparent bg-brand-soft text-brand", icon: Info },
  warn: { box: "border-warn/25 bg-warn-soft text-warn", icon: CircleAlert },
};

type Props = {
  tone: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Inline success / failure / info message, as in the "Lỗi_Cảnh báo" frames. */
export function Banner({ tone, title, children, action, className }: Props) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13px]", box, className)}
    >
      <Icon aria-hidden className="mt-px size-[18px] shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-xs font-normal opacity-90">{children}</div>}
      </div>
      {action}
    </div>
  );
}
