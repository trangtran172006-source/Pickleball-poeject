import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import { shiftRowFrom, shiftNameFor } from "@/server/lib/ownerData";
import { OPEN, CLOSE } from "@/server/lib/bookings";
import type { Paged, ShiftRow } from "@/shared/types";
const SIZE = 10;

async function nameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await admin().from("nguoi_dung").select("ma_nguoi_dung,ho_ten").in("ma_nguoi_dung", [...new Set(ids)]);
  return new Map((data ?? []).map((u) => [u.ma_nguoi_dung, u.ho_ten]));
}

export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const q = sp.get("q")?.trim(); const from = sp.get("from"); const to = sp.get("to"); const status = sp.get("status");
    let ids: string[] | null = null;
    if (q) {
      const { data } = await admin().from("nhan_vien").select("ma_nguoi_dung,ma_nhan_vien");
      const { data: us } = await admin().from("nguoi_dung").select("ma_nguoi_dung,ho_ten").eq("vai_tro", "staff");
      const nm = new Map((us ?? []).map((u) => [u.ma_nguoi_dung, u.ho_ten.toLowerCase()]));
      ids = (data ?? []).filter((r) => (nm.get(r.ma_nguoi_dung) ?? "").includes(q.toLowerCase()) || r.ma_nhan_vien.toLowerCase().includes(q.toLowerCase())).map((r) => r.ma_nguoi_dung);
      if (ids.length === 0) return ok({ items: [], total: 0, page, pageSize: SIZE } as Paged<ShiftRow>);
    }
    let query = admin().from("dang_ky_ca_lam").select("*", { count: "exact" });
    if (status) query = query.eq("trang_thai", status);
    if (from) query = query.gte("ngay_lam_viec", from);
    if (to) query = query.lte("ngay_lam_viec", to);
    if (ids) query = query.in("ma_nguoi_dung", ids);
    query = query.order("ngay_lam_viec", { ascending: false }).order("gio_bat_dau_ca").range((page - 1) * SIZE, page * SIZE - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    const names = await nameMap((data ?? []).map((r) => r.ma_nguoi_dung));
    const now = new Date().toISOString();
    const result: Paged<ShiftRow> = { items: (data ?? []).map((r) => shiftRowFrom(r, now, names.get(r.ma_nguoi_dung) ?? "")), total: count ?? 0, page, pageSize: SIZE };
    return ok(result);
  });
}

// A5: "Mã nhân viên" = email nhân viên. Chủ sân nhập email -> hệ thống cấp quyền nhân viên.
const regSchema = z.object({ staffCode: z.string().trim().min(1), date: z.string(), start: z.string(), end: z.string() });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let n = 0; n < 10; n++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireRole(["owner"]);
    const i = await body(req, regSchema);
    const email = i.staffCode.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw fail("STAFF_EMAIL_INVALID", 400);
    // A6: giờ ca phải nằm trong giờ mở/đóng cửa và hợp lệ
    if (i.start < OPEN || i.end > CLOSE || i.end <= i.start) throw fail("SHIFT_HOURS_RANGE", 400);

    // Tìm hoặc tạo tài khoản nhân viên theo email
    let maNguoiDung: string;
    let createdAccount: { email: string; password: string } | null = null;
    const { data: existing } = await admin().from("nguoi_dung").select("ma_nguoi_dung,vai_tro").eq("email", email).maybeSingle();
    if (existing) {
      if (existing.vai_tro !== "staff") throw fail("EMAIL_IN_USE", 409); // email đang dùng cho tài khoản khác
      maNguoiDung = existing.ma_nguoi_dung;
      await admin().from("nhan_vien").upsert({ ma_nguoi_dung: maNguoiDung, ma_nhan_vien: email });
    } else {
      const password = genPassword();
      const { data: created, error: ce } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
      if (ce || !created.user) throw fail("EMAIL_IN_USE", 409);
      const { data: res, error: e2 } = await admin().rpc("fn_tao_nhan_vien", { p_auth: created.user.id, p_ten: email.split("@")[0], p_email: email, p_sdt: "" });
      if (e2) { await admin().auth.admin.deleteUser(created.user.id); throw e2; }
      maNguoiDung = (res as { ma_nguoi_dung: string }).ma_nguoi_dung;
      createdAccount = { email, password };
    }

    // A5: không trùng ca (cùng nhân viên, cùng ngày, chồng giờ)
    const { data: sameDay } = await admin().from("dang_ky_ca_lam")
      .select("gio_bat_dau_ca,gio_ket_thuc_ca").eq("ma_nguoi_dung", maNguoiDung).eq("ngay_lam_viec", i.date);
    const overlap = (sameDay ?? []).some((s) => i.start < (s.gio_ket_thuc_ca as string).slice(0, 5) && (s.gio_bat_dau_ca as string).slice(0, 5) < i.end);
    if (overlap) throw fail("SHIFT_OVERLAP", 409);

    const id = ("CA" + i.date.replace(/-/g, "").slice(2) + Math.random().toString(36).slice(2, 5)).toUpperCase().slice(0, 12);
    const { error } = await admin().from("dang_ky_ca_lam").insert({
      ma_ca_lam: id, ma_nguoi_dung: maNguoiDung, ma_nhan_vien: email, ngay_lam_viec: i.date,
      gio_bat_dau_ca: i.start, gio_ket_thuc_ca: i.end, ten_ca: shiftNameFor(i.start), nguoi_tao: acc.ma_nguoi_dung,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") throw fail("SHIFT_OVERLAP", 409);
      throw error;
    }
    const { data } = await admin().from("dang_ky_ca_lam").select("*").eq("ma_ca_lam", id).single();
    const { data: u } = await admin().from("nguoi_dung").select("ho_ten").eq("ma_nguoi_dung", maNguoiDung).single();
    return ok({ ...shiftRowFrom(data!, new Date().toISOString(), u?.ho_ten ?? ""), createdAccount });
  });
}
