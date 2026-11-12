import { admin } from "@/server/lib/admin";
import { fail, handler, noContent, requireRole } from "@/server/lib/http";
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    const { data: row } = await admin().from("dang_ky_ca_lam").select("trang_thai,ngay_lam_viec,gio_bat_dau_ca").eq("ma_ca_lam", id).maybeSingle();
    if (!row) throw fail("NOT_FOUND", 404);
    const startTs = new Date(`${row.ngay_lam_viec}T${(row.gio_bat_dau_ca as string).slice(0,5)}:00+07:00`).toISOString();
    if (row.trang_thai !== "Chưa hoàn thiện" || startTs <= new Date().toISOString()) throw fail("SHIFT_LOCKED", 400);
    await admin().from("dang_ky_ca_lam").delete().eq("ma_ca_lam", id);
    return noContent();
  });
}
