import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import type { RefundResult } from "@/shared/types";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["owner"]);
    const { id } = await params;
    const { path } = await body(req, z.object({ path: z.string().min(1) }));
    const { error } = await admin().rpc("fn_xac_nhan_hoan_tien", { p_ma_dds: id, p_minh_chung: path, p_nguoi: acc.ma_nguoi_dung });
    if (error) throw error;
    const { data: row } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
    if (!row) throw fail("BOOKING_NOT_FOUND", 404);
    const result: RefundResult = {
      code: id, bookerName: row.ten_nguoi_dat as string, bookerPhone: row.sdt_nguoi_dat as string,
      courtName: (row.ten_san as string) ?? "", date: (row.ngay_thue as string) ?? (row.ngay_choi as string),
      start: row.gio_bd ? String(row.gio_bd).slice(0, 5) : "", end: row.gio_kt ? String(row.gio_kt).slice(0, 5) : "",
      amount: Number(row.tong_tien), proofName: path.split("/").pop() ?? path, proofSize: 0,
    };
    return ok(result);
  });
}
