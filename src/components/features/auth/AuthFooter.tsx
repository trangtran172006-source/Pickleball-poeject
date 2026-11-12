import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { question?: ReactNode; href: string; link: ReactNode; withArrow?: boolean; compact?: boolean };

/** Divider + "question? link" line at the bottom of each authentication card. */
export function AuthFooter({ question, href, link, withArrow, compact }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-t border-line text-sm text-muted ${compact ? "mt-6 pt-6" : "mt-8 pt-7"}`}
    >
      {question && <span>{question}</span>}
      <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
        {withArrow && <ArrowLeft aria-hidden className="size-4" />}
        {link}
      </Link>
    </div>
  );
}
