import { handler, ok, requireRole } from "@/server/lib/http";
import { staffHome } from "@/server/lib/home";
export async function GET() {
  return handler(async () => {
    const acc = await requireRole(["staff"]);
    const shift = acc.shift && acc.shift.checkedIn ? { name: acc.shift.name, start: acc.shift.start, end: acc.shift.end, ma_ca_lam: acc.shift.ma_ca_lam } : null;
    return ok(await staffHome(acc.ma_nguoi_dung, shift));
  });
}
