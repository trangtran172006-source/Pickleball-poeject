import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import { EMAIL_PATTERN, PHONE_PATTERN, PASSWORD_PATTERN } from "@/shared/schemas/auth";
import type { StaffAccountRow } from "@/shared/types";

export async function GET() {
  return handler(async () => {
    await requireRole(["owner"]);
    const { data } = await admin().from("nhan_vien").select("ma_nhan_vien,nguoi_dung(ma_nguoi_dung,ho_ten,email,so_dien_thoai,trang_thai_tai_khoan)");
    const rows: StaffAccountRow[] = (data ?? []).map((r) => {
      const n = (r as unknown as { nguoi_dung: { ma_nguoi_dung: string; ho_ten: string; email: string; so_dien_thoai: string; trang_thai_tai_khoan: StaffAccountRow["status"] } }).nguoi_dung;
      return { id: n.ma_nguoi_dung, staffCode: (r as { ma_nhan_vien: string }).ma_nhan_vien, fullName: n.ho_ten, email: n.email, phone: n.so_dien_thoai, status: n.trang_thai_tai_khoan };
    });
    return ok(rows);
  });
}

const createSchema = z.object({ fullName: z.string().trim().min(2).max(70), email: z.string().regex(EMAIL_PATTERN), phone: z.string().regex(PHONE_PATTERN), password: z.string().regex(PASSWORD_PATTERN) });
export async function POST(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const i = await body(req, createSchema);
    const email = i.email.toLowerCase();
    const { data: dup } = await admin().from("nguoi_dung").select("ma_nguoi_dung").or(`email.eq.${email},so_dien_thoai.eq.${i.phone}`);
    if (dup && dup.length) throw fail("ACCOUNT_EXISTS", 409);
    const { data: created, error } = await admin().auth.admin.createUser({ email, password: i.password, email_confirm: true });
    if (error || !created.user) throw fail("ACCOUNT_EXISTS", 409);
    const { data: res, error: e2 } = await admin().rpc("fn_tao_nhan_vien", { p_auth: created.user.id, p_ten: i.fullName, p_email: email, p_sdt: i.phone });
    if (e2) { await admin().auth.admin.deleteUser(created.user.id); throw e2; }
    const r = res as { ma_nguoi_dung: string; ma_nhan_vien: string };
    const row: StaffAccountRow = { id: r.ma_nguoi_dung, staffCode: r.ma_nhan_vien, fullName: i.fullName, email, phone: i.phone, status: "Hoạt động" };
    return ok(row);
  });
}
