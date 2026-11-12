import { fail, handler, ok, requireRole } from "@/server/lib/http";
import { refundDetail } from "@/server/lib/refunds";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    const d = await refundDetail(id);
    if (!d) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(d);
  });
}
