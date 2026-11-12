"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { customersApi } from "@/services/api/staff";

const MAX = 1000;

/** UI_23 – search customers by name, phone or email (UC_1). */
export function CustomerSearch({ base }: { base: string }) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const [keyword, setKeyword] = useState("");
  const [missing, setMissing] = useState(false);
  const [query, setQuery] = useState<{ q: string; page: number }>({ q: "", page: 1 });
  const list = useQuery({ queryKey: ["customers", query], queryFn: () => customersApi.search(query.q, query.page), placeholderData: keepPreviousData });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) return setMissing(true); // UC_1 3a / BR01
    setMissing(false);
    setQuery({ q: value, page: 1 });
  };

  return (
    <div>
      <PageTitle title={t("searchTitle")} />
      <Card className="p-5">
        <form onSubmit={submit} noValidate>
          <label htmlFor="keyword" className="text-xs font-medium text-ink">
            {t("keyword")} <span className="text-danger">*</span>
          </label>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1 basis-64">
              {/* UC_1 3b / BR02: input beyond 1000 characters is not accepted. */}
              <Input id="keyword" value={keyword} maxLength={MAX} invalid={missing} onChange={(event) => setKeyword(event.target.value.slice(0, MAX))} placeholder={t("keywordPlaceholder")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} />
              <div className="mt-1.5 flex justify-between gap-3 text-[11px]">
                <span role={missing ? "alert" : undefined} className="text-danger">
                  {missing ? tv("keywordRequired") : ""}
                </span>
                <span className="text-subtle" data-count>
                  {t("charCount", { count: keyword.length })}
                </span>
              </div>
            </div>
            <Button type="submit" className="px-5" iconLeft={<Search aria-hidden className="size-4" />}>
              {tc("search")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <h2 className="flex items-center gap-2.5 px-5 py-4 text-[15px] font-medium text-ink">
          <Users aria-hidden className="size-[18px] text-brand" strokeWidth={1.5} />
          {t("listTitle")}
        </h2>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t("notFound")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-page text-[10px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colName")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("phone")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("email")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colAccount")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colDetail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((customer) => (
                    <tr key={customer.id} data-customer={customer.id} className="border-t border-line text-xs">
                      <td className="px-5 py-4 font-medium text-ink">{customer.fullName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-body">{customer.phone}</td>
                      <td className="px-3 py-4 text-body [overflow-wrap:anywhere]">{customer.email}</td>
                      <td className="px-3 py-4">
                        <Badge tone={customer.online ? "green" : "gray"}>{customer.online ? tc("online") : tc("offline")}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`${base}/customers/${customer.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand hover:underline">
                          {tc("view")}
                          <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line">
              <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} itemLabel={tc("customer").toLocaleLowerCase()} onChange={(page) => setQuery({ ...query, page })} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
