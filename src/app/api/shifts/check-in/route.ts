import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, hcmClock, hcmToday, ok, requireRole } from "@/server/lib/http";
import { buildMe } from "@/server/lib/me";
import { shortId } from "@/server/lib/codes";
export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireRole(["staff"]);
    const { shiftId } = await body(req, z.object({ shiftId: z.string() }));
    const { data: row } = await admin().from("dang_ky_ca_lam")
      .select("ma_ca_lam,gio_bat_dau_ca,gio_ket_thuc_ca,ngay_lam_viec")
      .eq("ma_ca_lam", shiftId).eq("ma_nguoi_dung", acc.ma_nguoi_dung).maybeSingle();
    if (!row) throw fail("SHIFT_LOCKED", 400);
    const now = hcmClock();
    if (row.ngay_lam_viec !== hcmToday() || !(row.gio_bat_dau_ca <= now && now < row.gio_ket_thuc_ca))
      throw fail("SHIFT_LOCKED", 400);
    const { data: li } = await admin().from("lich_su_ca_lam").select("ma_lich_su_ca").eq("ma_ca_lam", shiftId).limit(1);
    if ((li ?? []).length === 0) {
      await admin().from("lich_su_ca_lam").insert({ ma_lich_su_ca: shortId("LC"), ma_ca_lam: shiftId });
    }
    return ok(await buildMe(acc.ma_nguoi_dung));
  });
}
