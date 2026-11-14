"use client";

import Link from "next/link";
import { ArrowLeft, CircleUser, Mail, Phone, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Card, PageTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { ApiError } from "@/services/api/client";
import { customersApi } from "@/services/api/staff";

/** UI_24 – one customer's details (UC_1 step 7). */
export function CustomerDetail({ base, id }: { base: string; id: string }) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const customer = useQuery({ queryKey: ["customer", id], queryFn: () => customersApi.detail(id) });
  const data = customer.data;
  const status = data && <Badge tone={data.online ? "green" : "gray"}>{data.online ? tc("online") : tc("offline")}</Badge>;

  return (
    <div>
      <PageTitle title={t("detailTitle")} />
      <Link href={`${base}/customers`} className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-brand hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        {t("backToResults")}
      </Link>
      <Card>
        {customer.isPending ? (
          <SkeletonRows rows={4} />
        ) : customer.isError || !data ? (
          customer.error instanceof ApiError && customer.error.status === 404 ? <EmptyState title={t("notFound")} /> : <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
        ) : (
          <>
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <Avatar name={data.fullName} src={data.avatarUrl} className="size-14 text-lg" />
              <div>
                <p className="text-lg font-semibold text-ink" data-customer-name>{data.fullName}</p>
                <div className="mt-1.5">{status}</div>
              </div>
            </div>
            <div className="border-t border-line px-5 py-5 sm:px-6">
              <h2 className="text-[13px] font-semibold text-ink">{t("info")}</h2>
              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                {(
                  [
                    [User, t("colName"), data.fullName],
                    [Phone, tc("phone"), data.phone],
                    [Mail, tc("email"), data.email],
                    [CircleUser, t("colAccount"), status],
                  ] as const
                ).map(([Icon, label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-subtle">{label}</dt>
                      <dd className="mt-1 text-[13px] font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
