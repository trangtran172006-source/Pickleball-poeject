import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole, requireShift } from "@/server/lib/http";
import type { ShiftTask } from "@/shared/types";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["staff", "owner"]);
    if (acc.vai_tro === "staff") await requireShift(acc);
    const caId = acc.shift?.ma_ca_lam;
    if (!caId) throw fail("SHIFT_REQUIRED", 403);
    const { id } = await params;
    const { done } = await body(req, z.object({ done: z.boolean() }));
    if (done) await admin().from("viec_trong_ca_hoan_thanh").upsert({ ma_ca_lam: caId, ma_viec: id, hoan_thanh_luc: new Date().toISOString() });
    else await admin().from("viec_trong_ca_hoan_thanh").delete().eq("ma_ca_lam", caId).eq("ma_viec", id);
    const { data: v } = await admin().from("viec_trong_ca").select("*").eq("ma_viec", id).single();
    const { data: dn } = await admin().from("viec_trong_ca_hoan_thanh").select("hoan_thanh_luc").eq("ma_ca_lam", caId).eq("ma_viec", id).maybeSingle();
    const task: ShiftTask = {
      id: v!.ma_viec, name: v!.ten_viec, time: v!.gio_thuc_hien ? (v!.gio_thuc_hien as string).slice(0, 5) : null,
      note: v!.mo_ta ?? null, done: !!dn, doneAt: dn?.hoan_thanh_luc ?? null,
    };
    return ok(task);
  });
}
