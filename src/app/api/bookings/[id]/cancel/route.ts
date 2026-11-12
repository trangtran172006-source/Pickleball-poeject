import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireRole } from "@/server/lib/http";
import { bookingDetail } from "@/server/lib/bookings";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["customer"]);
    const { id } = await params;
    const { error } = await admin().rpc("fn_huy_dat_san", { p_ma_dds: id, p_user: acc.ma_nguoi_dung });
    if (error) throw error;
    const detail = await bookingDetail(id);
    if (!detail) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(detail);
  });
}
