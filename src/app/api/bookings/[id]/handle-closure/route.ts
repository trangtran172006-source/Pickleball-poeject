import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import { bookingDetail } from "@/server/lib/bookings";
const schema = z.object({ choice: z.enum(["Hoàn tiền", "Dời lịch"]) });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["customer"]);
    const { id } = await params;
    const { choice } = await body(req, schema);
    const { error } = await admin().rpc("fn_khach_chon_xu_ly", { p_ma_dds: id, p_user: acc.ma_nguoi_dung, p_lua_chon: choice });
    if (error) throw error;
    const detail = await bookingDetail(id, acc.ma_nguoi_dung);
    if (!detail) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(detail);
  });
}
