import { fail, handler, ok, requireRole } from "@/server/lib/http";
import { rescheduleOptions } from "@/server/lib/reschedule";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const { id } = await params;
    const sp = new URL(req.url).searchParams;
    const r = await rescheduleOptions(id, sp.get("courtId") || undefined, sp.get("date") || undefined);
    if (!r) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(r);
  });
}
