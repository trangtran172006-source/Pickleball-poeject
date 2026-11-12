"use client";

import Link from "next/link";
import { Lock, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Card, PageTitle } from "@/components/ui/Card";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { useMe } from "@/lib/useMe";
import { genderKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";

/** UI_8 – the customer's own profile (UC_8.1). */
export function ProfileView() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const f = useFormat();
  const me = useMe();
  const data = me.data;
  const item = (label: React.ReactNode, value: string) => (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] text-subtle">{label}</dt>
      <dd className="mt-1.5 text-[13px] font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );

  return (
    <div>
      <PageTitle title={t("title")} subtitle={t("subtitle")} />
      <Card>
        {me.isPending ? (
          <SkeletonRows rows={5} />
        ) : me.isError || !data ? (
          <ErrorState error={me.error} onRetry={() => me.refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
              <Avatar name={data.fullName} src={data.avatarUrl} className="size-14 text-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink" data-profile-name>
                  {data.fullName}
                </p>
                <p className="mt-1 text-xs text-muted">{t("customerAccount")}</p>
              </div>
              <Link href="/customer/profile/edit" className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand px-3.5 text-xs font-semibold text-brand hover:bg-brand-soft">
                <SquarePen aria-hidden className="size-3.5" />
                {t("editButton")}
              </Link>
            </div>
            <div className="border-t border-line px-5 py-5 sm:px-6">
              <h2 className="text-[13px] font-semibold text-ink">{t("personal")}</h2>
              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">{item(tc("fullName"), data.fullName)}</div>
                {item(t("birthDate"), data.birthDate ? f.date(data.birthDate) : data.birthYear ? String(data.birthYear) : t("notSet"))}
                {item(t("gender"), data.gender ? tc(genderKey[data.gender]) : t("notSet"))}
              </dl>
            </div>
            <div className="border-t border-line px-5 py-5 sm:px-6">
              <h2 className="text-[13px] font-semibold text-ink">{t("contact")}</h2>
              <p className="mt-1.5 text-[11px] text-muted">{t("contactNote")}</p>
              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                {item(
                  <>
                    {tc("email")} <Lock aria-hidden className="size-2.5" />
                  </>,
                  data.email,
                )}
                {item(
                  <>
                    {tc("phone")} <Lock aria-hidden className="size-2.5" />
                  </>,
                  data.phone,
                )}
              </dl>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
