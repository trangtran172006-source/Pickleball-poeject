"use client";

import { useState, type FormEvent } from "react";
import { Lock, Search, ShieldCheck, Trash2 } from "lucide-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { todayISO } from "@/lib/dates";
import { shiftStatusKey } from "@/i18n/status";
import { useFormat } from "@/i18n/useFormat";
import { shiftAdminApi, type ShiftListQuery } from "@/services/api/owner";
import type { ShiftRow } from "@/shared/types";

/** UI_42 / UI_43 – shift schedule with delete of unfinished future shifts (UC_11.3 / UC_11.2). */
export function ShiftList() {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const today = todayISO();
  const [draft, setDraft] = useState<{ q: string; from: string | null; to: string | null; status: string }>({ q: "", from: null, to: null, status: "" });
  const [filters, setFilters] = useState<ShiftListQuery>({ page: 1 });
  const [removing, setRemoving] = useState<ShiftRow | null>(null);
  const list = useQuery({ queryKey: ["shifts-admin", filters], queryFn: () => shiftAdminApi.list(filters), placeholderData: keepPreviousData });

  const remove = useMutation({
    mutationFn: (id: string) => shiftAdminApi.remove(id),
    onSuccess: () => {
      toast.show("success", t("deleted"));
      setRemoving(null);
      void client.invalidateQueries({ queryKey: ["shifts-admin"] });
    },
    onError: (error) => {
      toast.show("error", errorText(error, "errors.shiftDeleteFailed"));
      setRemoving(null);
    },
  });
  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ q: draft.q.trim() || undefined, from: draft.from, to: draft.to, status: draft.status || undefined, page: 1 });
  };
  const deletable = list.data?.items.filter((item) => item.deletable).length ?? 0;
  const locked = (list.data?.items.length ?? 0) - deletable;

  return (
    <div>
      <PageTitle
        title={t("listTitle")}
        subtitle={t("listSub")}
        action={
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-xs font-medium text-body">
            {t("todayIs", { date: f.date(today) })}
          </span>
        }
      />
      <div className="mb-5 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-brand">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold">{t("ruleTitle")}</p>
          <p className="mt-0.5 text-[11px]">{t("ruleDesc")}</p>
        </div>
      </div>

      <form onSubmit={search} className="mb-5 grid items-center gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <Input value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} />
        <div className="flex items-center gap-1.5">
          <DatePicker value={draft.from} onChange={(from) => setDraft({ ...draft, from })} placeholder={t("workDate")} clearable />
          <span className="text-subtle">–</span>
          <DatePicker value={draft.to} min={draft.from ?? undefined} align="right" onChange={(to) => setDraft({ ...draft, to })} placeholder={t("workDate")} clearable />
        </div>
        <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} aria-label={tc("status")}>
          <option value="">{tc("allStatuses")}</option>
          <option value="Chưa hoàn thiện">{ts("shiftPending")}</option>
          <option value="Đã hoàn thiện">{ts("shiftDone")}</option>
        </Select>
        <Button type="submit" className="px-5" iconLeft={<Search aria-hidden className="size-4" />}>
          {tc("search")}
        </Button>
      </form>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="text-[15px] font-medium text-ink">{t("tableTitle")}</h2>
          {list.data && <span className="text-[11px] text-subtle">{t("counts", { deletable, locked })}</span>}
        </div>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-page text-[10px] text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colDate")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("colStaff")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("start")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("end")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{tc("status")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("colAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr key={item.id} data-shift={item.code} className="border-t border-line text-xs">
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-ink">{f.date(item.date)}</span>
                        <span className="mt-1 block text-[10px] text-subtle">{f.weekday(item.date)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={item.staffName} className="size-8 text-[11px]" />
                          <span>
                            <span className="block font-medium text-ink">{item.staffName}</span>
                            <span className="mt-0.5 block text-[10px] text-subtle">{item.code}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-body">{item.start}</td>
                      <td className="px-3 py-3.5 text-body">{item.end}</td>
                      <td className="px-3 py-3.5">
                        <Badge tone={item.status === "Đã hoàn thiện" ? "green" : "amber"}>{ts(shiftStatusKey[item.status])}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.deletable ? (
                          <button type="button" onClick={() => setRemoving(item)} aria-label={t("deleteShift")} data-delete-shift className="flex size-8 items-center justify-center rounded-md border border-danger-line text-danger hover:bg-danger-soft">
                            <Trash2 aria-hidden className="size-3.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-subtle">
                            <Lock aria-hidden className="size-3" />
                            {item.lockReason === "done" ? t("lockedDone") : t("lockedPast")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line">
              <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} itemLabel={t("item")} onChange={(page) => setFilters({ ...filters, page })} />
            </div>
            <p className="border-t border-line px-5 py-3 text-[11px] text-subtle">{t("footNote")}</p>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        loading={remove.isPending}
        confirmLabel={tc("delete")}
        title={t("deleteAsk")}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
            <Trash2 aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
        }
      >
        {removing && (
          <div className="rounded-lg bg-page px-4 py-3 text-xs">
            <p className="font-semibold text-ink">{removing.staffName}</p>
            <p className="mt-1.5 text-muted">
              {f.date(removing.date)} · {removing.start}–{removing.end} · {removing.code}
            </p>
            <p className="mt-2 text-danger">{t("deleteWarn")}</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
