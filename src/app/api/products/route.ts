import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, ok, requireRole } from "@/server/lib/http";
import { productFromRow } from "@/server/lib/catalog";
import { shortId } from "@/server/lib/codes";

export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const q = new URL(req.url).searchParams.get("q")?.trim();
    let query = admin().from("hang_hoa_dich_vu").select("*").eq("da_xoa", false).order("ten_hhdv");
    if (q) query = query.ilike("ten_hhdv", `%${q}%`);
    const { data } = await query;
    return ok(await Promise.all((data ?? []).map(productFromRow)));
  });
}

const writeSchema = z.object({
  name: z.string().trim().min(1).max(100), unit: z.string().trim().min(1).max(20),
  price: z.number().int().min(0), type: z.enum(["Hàng hóa", "Dịch vụ"]),
  group: z.union([z.enum(["Đồ uống", "Phụ kiện"]), z.null()]),
  description: z.string().max(255).default(""), stock: z.number().int().min(0).nullable(),
  imagePath: z.string().optional(),
});
export async function POST(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const input = await body(req, writeSchema);
    const id = ("SP" + Math.random().toString(36).slice(2, 10)).toUpperCase().slice(0, 12);
    const row = {
      ma_hhdv: id, ten_hhdv: input.name, don_vi: input.unit, gia: input.price, loai: input.type,
      nhom: input.type === "Dịch vụ" ? null : input.group, mo_ta: input.description || null,
      ton_kho: input.type === "Dịch vụ" ? null : input.stock, anh_minh_hoa: input.imagePath ?? null, da_xoa: false,
    };
    await admin().from("hang_hoa_dich_vu").insert(row);
    const { data } = await admin().from("hang_hoa_dich_vu").select("*").eq("ma_hhdv", id).single();
    return ok(await productFromRow(data!));
  });
}
