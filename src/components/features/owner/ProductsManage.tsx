"use client";

import { useState, type FormEvent } from "react";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { useFormat } from "@/i18n/useFormat";
import { productAdminApi } from "@/services/api/owner";
import type { Product } from "@/shared/types";
import { ProductForm } from "./ProductForm";

/** UI_47 – products & services list with add / edit / delete (UC_7.1–7.4). */
export function ProductsManage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const list = useQuery({ queryKey: ["products-admin", query], queryFn: () => productAdminApi.list(query || undefined) });

  const remove = useMutation({
    mutationFn: (id: string) => productAdminApi.remove(id),
    onSuccess: () => {
      toast.show("success", t("deleted"));
      setRemoving(null);
      void client.invalidateQueries({ queryKey: ["products-admin"] });
      void client.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.show("error", errorText(error, "errors.deleteFailed"));
      setRemoving(null);
    },
  });
  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery(keyword.trim());
  };

  return (
    <div>
      <PageTitle title={t("title")} subtitle={t("subtitle")} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-medium text-ink">{t("listTitle")}</h2>
            <p className="mt-1 text-[11px] text-muted">{t("listSub")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <form onSubmit={search} className="w-full sm:w-56">
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={100} placeholder={t("searchPlaceholder")} aria-label={tc("search")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} className="h-9" />
            </form>
            <Button className="h-9" onClick={() => setEditing("new")} iconLeft={<Plus aria-hidden className="size-4" />} data-add-product>
              {t("add")}
            </Button>
          </div>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.length === 0 ? (
          <EmptyState title={t("notFound")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-page text-[10px] text-subtle">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">{t("colName")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{t("type")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{t("colUnit")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{t("colPrice")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{t("colStock")}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((item) => (
                  <tr key={item.id} data-product={item.id} className="border-t border-line text-xs">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-page text-subtle">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                            <img src={item.imageUrl} alt="" className="size-full object-contain" />
                          ) : (
                            <Package aria-hidden className="size-4.5" strokeWidth={1.5} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{item.name}</span>
                          {item.group && <span className="mt-0.5 block text-[10px] text-subtle">{t(item.group === "Đồ uống" ? "groupDrink" : "groupAccessory")}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge tone={item.type === "Hàng hóa" ? "green" : "gray"}>{t(item.type === "Hàng hóa" ? "typeGoods" : "typeService")}</Badge>
                    </td>
                    <td className="px-3 py-3.5 text-body">{item.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-medium text-ink">{f.currency(item.price)}</td>
                    <td className="px-3 py-3.5 text-body">{item.stock === null ? "—" : item.stock}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setEditing(item)} aria-label={tc("edit")} data-edit className="flex size-8 items-center justify-center rounded-md border border-line text-brand hover:bg-brand-soft">
                          <Pencil aria-hidden className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => setRemoving(item)} aria-label={tc("delete")} data-delete className="flex size-8 items-center justify-center rounded-md border border-danger-line text-danger hover:bg-danger-soft">
                          <Trash2 aria-hidden className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.length > 0 && <p className="px-5 py-3 text-[11px] text-subtle">{t("totalItems", { count: list.data.length })}</p>}
      </Card>

      {editing && <ProductForm product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        loading={remove.isPending}
        confirmLabel={tc("delete")}
        title={t("deleteTitle")}
        subtitle={t("deleteSub")}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
            <Trash2 aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
        }
      >
        {removing && (
          <div className="rounded-lg bg-page px-4 py-3 text-xs">
            <p className="font-semibold text-ink">{removing.name}</p>
            <p className="mt-1 text-muted">
              {t("unitIs", { unit: removing.unit })} · {f.currency(removing.price)}
            </p>
            <p className="mt-2 text-danger">{t("deleteAsk")}</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
