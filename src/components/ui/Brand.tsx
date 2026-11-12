import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = { href: string; name: string; tagline?: string; stacked?: boolean; className?: string };

/** Picklehead badge + product name. `stacked` is the two-line sidebar variant. */
export function Brand({ href, name, tagline, stacked, className }: Props) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Image src="/images/logo.png" alt="" width={stacked ? 44 : 46} height={stacked ? 50 : 52} className="shrink-0" priority />
      <span className="min-w-0">
        <span className={cn("block font-semibold text-brand", stacked ? "max-w-[100px] text-base leading-[1.3]" : "truncate text-lg sm:text-[22px]")}>{name}</span>
        {tagline && <span className="mt-0.5 block max-w-[100px] text-[9px] leading-tight text-subtle">{tagline}</span>}
      </span>
    </Link>
  );
}
