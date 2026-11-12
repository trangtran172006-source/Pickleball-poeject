import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import { shiftRowFrom, shiftNameFor } from "@/server/lib/ownerData";
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

const regSchema = z.object({ staffCode: z.string().trim().min(1), date: z.string(), start: z.string(), end: z.string() });
export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireRole(["owner"]);
    const i = await body(req, regSchema);
    const { data: nv } = await admin().from("nhan_vien").select("ma_nguoi_dung,ma_nhan_vien").eq("ma_nhan_vien", i.staffCode).maybeSingle();
    if (!nv) throw fail("STAFF_NOT_FOUND", 404);
    const id = ("CA" + i.date.replace(/-/g, "").slice(2) + Math.random().toString(36).slice(2, 5)).toUpperCase().slice(0, 12);
    const { error } = await admin().from("dang_ky_ca_lam").insert({
      ma_ca_lam: id, ma_nguoi_dung: nv.ma_nguoi_dung, ma_nhan_vien: nv.ma_nhan_vien, ngay_lam_viec: i.date,
      gio_bat_dau_ca: i.start, gio_ket_thuc_ca: i.end, ten_ca: shiftNameFor(i.start), nguoi_tao: acc.ma_nguoi_dung,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") throw fail("SHIFT_LOCKED", 409);
      throw error;
    }
    const { data } = await admin().from("dang_ky_ca_lam").select("*").eq("ma_ca_lam", id).single();
    const { data: u } = await admin().from("nguoi_dung").select("ho_ten").eq("ma_nguoi_dung", nv.ma_nguoi_dung).single();
    return ok(shiftRowFrom(data!, new Date().toISOString(), u?.ho_ten ?? ""));
  });
}
