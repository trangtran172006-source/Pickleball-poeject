import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, noContent, ok, requireRole } from "@/server/lib/http";
import { productFromRow } from "@/server/lib/catalog";

const writeSchema = z.object({
  name: z.string().trim().min(1).max(100), unit: z.string().trim().min(1).max(20),
  price: z.number().int().min(0), type: z.enum(["Hàng hóa", "Dịch vụ"]),
  group: z.union([z.enum(["Đồ uống", "Phụ kiện"]), z.null()]),
  description: z.string().max(255).default(""), stock: z.number().int().min(0).nullable(),
  imagePath: z.string().optional(),
});
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    const input = await body(req, writeSchema);
    const patch: Record<string, unknown> = {
      ten_hhdv: input.name, don_vi: input.unit, gia: input.price, loai: input.type,
      nhom: input.type === "Dịch vụ" ? null : input.group, mo_ta: input.description || null,
      ton_kho: input.type === "Dịch vụ" ? null : input.stock,
    };
    if (input.imagePath) patch.anh_minh_hoa = input.imagePath;
    await admin().from("hang_hoa_dich_vu").update(patch).eq("ma_hhdv", id);
    const { data } = await admin().from("hang_hoa_dich_vu").select("*").eq("ma_hhdv", id).single();
    return ok(await productFromRow(data!));
  });
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    // T7: hard-delete if never sold, else soft-delete to keep reports intact
    const { count } = await admin().from("ct_don_hhdv").select("ma_hhdv", { count: "exact", head: true }).eq("ma_hhdv", id);
    if ((count ?? 0) > 0) await admin().from("hang_hoa_dich_vu").update({ da_xoa: true }).eq("ma_hhdv", id);
    else await admin().from("hang_hoa_dich_vu").delete().eq("ma_hhdv", id);
    return noContent();
  });
}
