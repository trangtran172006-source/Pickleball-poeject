import { fail, handler, ok, requireUser } from "@/server/lib/http";
import { bookingDetail } from "@/server/lib/bookings";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireUser();
    const { id } = await params;
    const restrict = acc.vai_tro === "customer" ? acc.ma_nguoi_dung : undefined;
    const detail = await bookingDetail(id, restrict);
    if (!detail) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(detail);
  });
}
