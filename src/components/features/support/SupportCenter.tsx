"use client";

import { Headphones, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, PageTitle } from "@/components/ui/Card";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { courtsApi } from "@/services/api/customer";

/** "Trung tâm hỗ trợ" in the sidebar: club hotline and address. */
export function SupportCenter() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tb = useTranslations("booking");
  const settings = useQuery({ queryKey: ["settings"], queryFn: courtsApi.settings, staleTime: 300_000 });
  return (
    <div>
      <PageTitle title={t("supportTitle")} subtitle={t("supportSub")} />
      <Card className="max-w-xl">
        {settings.isPending ? (
          <SkeletonRows rows={2} />
        ) : settings.isError ? (
          <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <ul className="divide-y divide-line">
            <li className="flex items-center gap-3.5 px-5 py-4">
              <Headphones aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
              <div>
                <p className="text-[11px] text-subtle">{t("hotline")}</p>
                <a href={`tel:${settings.data.hotline.replace(/\s/g, "")}`} className="mt-0.5 block text-sm font-semibold text-brand">
                  {settings.data.hotline || "—"}
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3.5 px-5 py-4">
              <MapPin aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-subtle">{tc("clubName")}</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{tc("address")}</p>
              </div>
              {settings.data.mapUrl && (
                <a href={settings.data.mapUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-brand hover:underline">
                  {tb("viewMap")}
                </a>
              )}
            </li>
          </ul>
        )}
      </Card>
    </div>
  );
}
