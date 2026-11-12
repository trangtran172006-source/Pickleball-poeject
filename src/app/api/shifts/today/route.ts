import { handler, ok, requireRole } from "@/server/lib/http";
import { shiftToday } from "@/server/lib/shifts";
export async function GET() {
  return handler(async () => {
    const acc = await requireRole(["staff"]);
    return ok(await shiftToday(acc.ma_nguoi_dung));
  });
}
