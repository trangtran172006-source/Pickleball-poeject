import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireUser } from "@/server/lib/http";
import { bookingDetail } from "@/server/lib/bookings";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireUser();
    const { id } = await params;
    const { path } = await body(req, z.object({ path: z.string().min(1) }));
    const { error } = await admin().rpc("fn_xac_nhan_thanh_toan", { p_ma_dds: id, p_minh_chung: path });
    if (error) throw error;
    const detail = await bookingDetail(id);
    if (!detail) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(detail);
  });
}
