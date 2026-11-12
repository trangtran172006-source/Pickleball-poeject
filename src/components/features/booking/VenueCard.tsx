import type { ReactNode } from "react";
import { PanelsTopLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

/** Club name + address strip shown at the top of every booking step. */
export function VenueCard({ action }: { action?: ReactNode }) {
  const tc = useTranslations("common");
  return (
    <Card className="flex items-center gap-3.5 px-5 py-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <PanelsTopLeft aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-ink">{tc("appName")}</p>
        <p className="mt-1 truncate text-xs text-muted">{tc("address")}</p>
      </div>
      {action}
    </Card>
  );
}
