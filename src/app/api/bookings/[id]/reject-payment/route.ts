import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireRole, requireShift } from "@/server/lib/http";
import { bookingDetail } from "@/server/lib/bookings";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["staff", "owner"]);
    if (acc.vai_tro === "staff") await requireShift(acc);
    const { id } = await params;
    const { error } = await admin().rpc("fn_tu_choi_thanh_toan", { p_ma_dds: id, p_nguoi: acc.ma_nguoi_dung, p_ly_do: null });
    if (error) throw error;
    const d = await bookingDetail(id); if (!d) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(d);
  });
}
