"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Handshake, Minus, Package, Plus, Search, ShoppingBag } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { useFormat } from "@/i18n/useFormat";
import { productsApi } from "@/services/api/staff";
import type { OrderMethod, Product, ProductGroup } from "@/shared/types";

type Tab = "goods" | "services";

/** UI_21 / UI_22 – counter order with products and services (UC_13). */
export function Pos() {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const tp = useTranslations("products");
  const te = useTranslations("errors");
  const f = useFormat();
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const [tab, setTab] = useState<Tab>("goods");
  const [group, setGroup] = useState<ProductGroup | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<OrderMethod>("Tiền mặt");
  const [created, setCreated] = useState(false);
  const products = useQuery({ queryKey: ["products"], queryFn: () => productsApi.list() });
  const all = useMemo(() => products.data ?? [], [products.data]);

  const visible = all.filter(
    (item) =>
      (tab === "goods" ? item.type === "Hàng hóa" : item.type === "Dịch vụ") &&
      (tab === "services" || group === "all" || item.group === group) &&
      item.name.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()),
  );
  const lines = all.filter((item) => (cart[item.id] ?? 0) > 0).map((item) => ({ item, quantity: cart[item.id], amount: cart[item.id] * item.price }));
  const sum = (type: Product["type"]) => lines.filter((line) => line.item.type === type);
  const goods = sum("Hàng hóa");
  const services = sum("Dịch vụ");
  const count = (list: typeof lines) => list.reduce((total, line) => total + line.quantity, 0);
  const money = (list: typeof lines) => list.reduce((total, line) => total + line.amount, 0);
  const total = money(lines);

  // UC_13 BR02: never more than what is in stock.
  const change = (item: Product, delta: number) => {
    const next = (cart[item.id] ?? 0) + delta;
    if (next < 0) return;
    if (item.stock !== null && next > item.stock) return toast.show("error", te("outOfStock"));
    setCreated(false);
    setCart({ ...cart, [item.id]: next });
  };

  const order = useMutation({
    mutationFn: () => productsApi.createOrder({ items: lines.map((line) => ({ productId: line.item.id, quantity: line.quantity })), method }),
    onSuccess: () => {
      setCart({});
      setCreated(true);
      void client.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => void client.invalidateQueries({ queryKey: ["products"] }),
  });
  const tabs: Array<{ key: Tab; label: string; icon: typeof Package; count: number }> = [
    { key: "goods", label: t("tabGoods"), icon: ShoppingBag, count: goods.length },
    { key: "services", label: t("tabServices"), icon: Handshake, count: services.length },
  ];
  const shown = tab === "goods" ? goods : services;

  return (
    <div>
      <PageTitle title={t("title")} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                data-tab={item.key}
                onClick={() => setTab(item.key)}
                className={cn("flex h-11 items-center justify-center gap-2.5 rounded-lg text-[13px]", tab === item.key ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:text-ink")}
              >
                <item.icon aria-hidden className="size-4" strokeWidth={1.75} />
                {item.label}
                {item.count > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">{item.count}</span>}
              </button>
            ))}
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-medium text-ink">{tab === "goods" ? t("goodsTitle") : t("servicesTitle")}</h2>
            <p className="mt-1.5 text-xs text-muted">{tab === "goods" ? t("goodsSub") : t("servicesSub")}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {tab === "goods" &&
                  (
                    [
                      ["all", t("all")],
                      ["Đồ uống", tp("groupDrink")],
                      ["Phụ kiện", tp("groupAccessory")],
                    ] as const
                  ).map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={group === key} onClick={() => setGroup(key)} className={cn("h-9 rounded-lg border px-4 text-xs", group === key ? "border-brand bg-brand font-semibold text-white" : "border-line bg-white text-body hover:border-brand")}>
                      {label}
                    </button>
                  ))}
              </div>
              <div className="w-full sm:w-[210px]">
                <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={100} placeholder={tab === "goods" ? t("searchGoods") : t("searchServices")} aria-label={tab === "goods" ? t("searchGoods") : t("searchServices")} left={<Search aria-hidden className="size-4" strokeWidth={1.75} />} className="h-9" />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              {products.isPending ? (
                <SkeletonRows rows={4} />
              ) : products.isError ? (
                <ErrorState error={products.error} onRetry={() => products.refetch()} />
              ) : visible.length === 0 ? (
                <EmptyState title={tp("notFound")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead className="bg-page text-[10px] uppercase text-subtle">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">{t("colProduct")}</th>
                        <th scope="col" className="px-3 py-3 font-medium">{t("colPrice")}</th>
                        <th scope="col" className="px-3 py-3 font-medium">{t("colQty")}</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">{t("colLine")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => {
                        const quantity = cart[item.id] ?? 0;
                        return (
                          <tr key={item.id} data-product={item.id} className="border-t border-line">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3.5">
                                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-page text-subtle">
                                  {item.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                                    <img src={item.imageUrl} alt="" className="size-full object-contain" />
                                  ) : (
                                    <Package aria-hidden className="size-5" strokeWidth={1.5} />
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[13px] font-medium text-ink">{item.name}</span>
                                  <span className="mt-1 block text-[11px] text-muted">
                                    {[item.description ?? item.unit, item.stock !== null ? t("stockLeft", { count: item.stock }) : null].filter(Boolean).join(" · ")}
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-xs text-ink">{f.currency(item.price)}</td>
                            <td className="px-3 py-3.5">
                              <div className={cn("inline-flex h-8 items-center rounded-md border", quantity > 0 ? "border-brand" : "border-line")}>
                                <button type="button" aria-label={t("decrease")} disabled={quantity === 0} onClick={() => change(item, -1)} className="flex size-8 items-center justify-center text-body disabled:opacity-30">
                                  <Minus aria-hidden className="size-3.5" />
                                </button>
                                <span data-qty className={cn("w-9 text-center text-xs", quantity > 0 ? "font-semibold text-ink" : "text-subtle")}>
                                  {quantity}
                                </span>
                                <button type="button" aria-label={t("increase")} onClick={() => change(item, 1)} className="flex size-8 items-center justify-center text-brand">
                                  <Plus aria-hidden className="size-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] font-semibold text-brand">{quantity > 0 ? f.currency(quantity * item.price) : <span className="font-normal text-subtle">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{tab === "goods" ? t("chosenGoods", { kinds: shown.length, count: count(shown) }) : t("chosenServices", { kinds: shown.length, count: count(shown) })}</span>
              <span className="text-[15px] font-semibold text-brand">{f.currency(money(shown))}</span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-6" data-order>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">{t("orderInfo")}</h2>
              <ClipboardList aria-hidden className="size-5 text-brand" strokeWidth={1.5} />
            </div>
            <p className="mt-5 text-[13px] font-medium text-ink">{tc("appName")}</p>
            <p className="mt-1.5 text-[11px] text-muted">{tc("address")}</p>
            <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
              {lines.length === 0 && <p className="text-xs text-muted">{t("emptyCart")}</p>}
              {goods.length > 0 && (
                <div>
                  <p className="flex justify-between gap-3 text-xs">
                    <span className="text-muted">{t("goodsLine", { count: count(goods) })}</span>
                    <span className="font-semibold text-ink">{f.currency(money(goods))}</span>
                  </p>
                  <p className="mt-1.5 text-[11px] text-subtle">{goods.map((line) => `${line.quantity} ${line.item.name}`).join(" · ")}</p>
                </div>
              )}
              {services.length > 0 && (
                <div>
                  <p className="flex justify-between gap-3 text-xs">
                    <span className="text-muted">{t("servicesLine", { count: count(services) })}</span>
                    <span className="font-semibold text-ink">{f.currency(money(services))}</span>
                  </p>
                  <p className="mt-1.5 text-[11px] text-subtle">{services.map((line) => `${line.quantity} ${line.item.name}`).join(" · ")}</p>
                </div>
              )}
            </div>
            <fieldset className="mt-5 border-t border-line pt-5 [&>legend]:float-left [&>legend]:w-full">
              <legend className="mb-2.5 text-xs text-muted">{t("payMethod")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Tiền mặt", t("cash")],
                    ["Chuyển khoản", t("transfer")],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className={cn("flex h-9 cursor-pointer items-center justify-center rounded-lg border text-xs", method === value ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line text-body")}>
                    <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
              <span className="text-[13px] font-medium text-ink">{tc("total")}</span>
              <span className="text-2xl font-semibold text-brand" data-total>
                {f.currency(total)}
              </span>
            </div>
            <p className="mt-4 text-[10px] text-subtle">{t("taxIncluded")}</p>
          </Card>
          {created && <Banner tone="success" title={t("created")} />}
          {order.isError && <Banner tone="error" title={errorText(order.error, "errors.orderFailed")} />}
          <Button className="h-[46px] self-end px-6 text-sm" disabled={lines.length === 0} loading={order.isPending} onClick={() => order.mutate()} data-create-order>
            {t("create")}
          </Button>
        </div>
      </div>
    </div>
  );
}
