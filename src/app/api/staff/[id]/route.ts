import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import type { StaffAccountRow } from "@/shared/types";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    const { status } = await body(req, z.object({ status: z.enum(["Hoạt động", "Khóa"]) }));
    await admin().from("nguoi_dung").update({ trang_thai_tai_khoan: status }).eq("ma_nguoi_dung", id).eq("vai_tro", "staff");
    const { data } = await admin().from("nhan_vien").select("ma_nhan_vien,nguoi_dung(ma_nguoi_dung,ho_ten,email,so_dien_thoai,trang_thai_tai_khoan)").eq("ma_nguoi_dung", id).maybeSingle();
    if (!data) throw fail("STAFF_NOT_FOUND", 404);
    const n = (data as unknown as { nguoi_dung: { ma_nguoi_dung: string; ho_ten: string; email: string; so_dien_thoai: string; trang_thai_tai_khoan: StaffAccountRow["status"] } }).nguoi_dung;
    const row: StaffAccountRow = { id: n.ma_nguoi_dung, staffCode: (data as { ma_nhan_vien: string }).ma_nhan_vien, fullName: n.ho_ten, email: n.email, phone: n.so_dien_thoai, status: n.trang_thai_tai_khoan };
    return ok(row);
  });
}
