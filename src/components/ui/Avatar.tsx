import { cn } from "@/lib/cn";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts.length > 1 ? parts[0][0] : parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type Props = { name: string; src?: string | null; className?: string };

/** Round avatar: the uploaded photo, or the person's initials on pale green. */
export function Avatar({ name, src, className }: Props) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[13px] font-semibold text-brand", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URL
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
