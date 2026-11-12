import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireRole, requireShift } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["staff", "owner"]);
    if (acc.vai_tro === "staff") await requireShift(acc);
    const { id } = await params;
    await admin().from("don_dat_san").update({ da_nhan_san_luc: new Date().toISOString() })
      .eq("ma_dat_san", id).eq("trang_thai_dat_san", "Đã xác nhận");
    const { data } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
    if (!data) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(summaryFromView(data));
  });
}
