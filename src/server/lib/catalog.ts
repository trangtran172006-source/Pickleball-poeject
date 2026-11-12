import { admin } from "./admin";
import type { Product } from "@/shared/types";

export async function signedProductUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await admin().storage.from("products").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
export async function productFromRow(r: Record<string, unknown>): Promise<Product> {
  return {
    id: r.ma_hhdv as string,
    name: r.ten_hhdv as string,
    unit: r.don_vi as string,
    price: Number(r.gia),
    type: r.loai as Product["type"],
    group: (r.nhom as Product["group"]) ?? null,
    description: (r.mo_ta as string) ?? null,
    imageUrl: await signedProductUrl((r.anh_minh_hoa as string) ?? null),
    stock: r.ton_kho === null || r.ton_kho === undefined ? null : Number(r.ton_kho),
  };
}
