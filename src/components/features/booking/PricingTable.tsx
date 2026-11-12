"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useFormat } from "@/i18n/useFormat";
import { courtsApi } from "@/services/api/customer";
import type { Pricing } from "@/shared/types";

type Column = { group: "weekday" | "weekend"; label: string; bandIds: string[] };

/** Weekend columns collapse into one when every band has the same price, as in the design. */
function columns(pricing: Pricing): Column[] {
  const weekday = pricing.bands.map((band) => ({ group: "weekday" as const, label: `${band.start}–${band.end}`, bandIds: [band.id] }));
  const uniform = pricing.courts.every((court) => new Set(pricing.bands.map((band) => court.prices[band.id]?.weekend)).size <= 1);
  const weekend =
    uniform && pricing.bands.length > 0
      ? [{ group: "weekend" as const, label: `${pricing.bands[0].start}–${pricing.bands[pricing.bands.length - 1].end}`, bandIds: [pricing.bands[0].id] }]
      : pricing.bands.map((band) => ({ group: "weekend" as const, label: `${band.start}–${band.end}`, bandIds: [band.id] }));
  return [...weekday, ...weekend];
}

/** UI_18 / UI_33 / top of UI_44 – price per 30 minutes by court, day group and time band. */
export function PricingTable() {
  const t = useTranslations("courts");
  const tc = useTranslations("common");
  const tb = useTranslations("booking");
  const f = useFormat();
  const pricing = useQuery({ queryKey: ["pricing"], queryFn: courtsApi.pricing });

  return (
    <Card className="overflow-hidden" data-pricing>
      <div className="flex flex-wrap items-start justify-between gap-2 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium text-ink">{t("courtList")}</h2>
          <p className="mt-1 text-[11px] text-muted">{t("addressIs", { address: tc("address") })}</p>
        </div>
        <span className="text-[11px] text-subtle">{tc("unitPer30")}</span>
      </div>
      {pricing.isPending ? (
        <SkeletonRows rows={3} />
      ) : pricing.isError ? (
        <ErrorState error={pricing.error} onRetry={() => pricing.refetch()} />
      ) : pricing.data.courts.length === 0 ? (
        <EmptyState title={tb("noCourts")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="bg-page">
              <tr>
                <th scope="col" className="px-5 py-3 text-[11px] font-medium text-body">
                  {tc("court")}
                </th>
                {columns(pricing.data).map((column) => (
                  <th key={`${column.group}-${column.label}`} scope="col" className="px-4 py-3 font-normal">
                    <span className="block text-[10px] text-subtle">{tc(column.group === "weekday" ? "weekdayGroup" : "weekendGroup")}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-ink">{column.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricing.data.courts.map((court) => (
                <tr key={court.id} className="border-t border-line">
                  <th scope="row" className="px-5 py-4 font-normal">
                    <span className="block text-xs font-semibold text-ink">{court.name}</span>
                    <span className="mt-1 block text-[10px] text-subtle">{tc("standardCourt")}</span>
                  </th>
                  {columns(pricing.data).map((column) => (
                    <td key={`${column.group}-${column.label}`} className="px-4 py-4 text-xs font-semibold text-ink">
                      {f.currency(court.prices[column.bandIds[0]]?.[column.group] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
