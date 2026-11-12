import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, ok, requireRole, requireShift } from "@/server/lib/http";
const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  method: z.enum(["Tiền mặt", "Chuyển khoản"]),
});
export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireRole(["staff", "owner"]);
    if (acc.vai_tro === "staff") await requireShift(acc);
    const input = await body(req, schema);
    const { data, error } = await admin().rpc("fn_tao_don_hhdv", {
      p_nguoi: acc.ma_nguoi_dung,
      p_items: input.items.map((i) => ({ ma_hhdv: i.productId, so_luong: i.quantity })),
      p_phuong_thuc: input.method,
    });
    if (error) throw error;
    const r = data as { ma_don: string; tong_tien: number };
    return ok({ orderId: r.ma_don, total: Number(r.tong_tien) });
  });
}
