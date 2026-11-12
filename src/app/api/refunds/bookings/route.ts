import { admin } from "@/server/lib/admin";
import { handler, ok, requireRole } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
import type { Paged, RefundBookingRow } from "@/shared/types";
const SIZE = 10;
export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const q = sp.get("q")?.trim(); const status = sp.get("status");
    let query = admin().from("v_booking").select("*", { count: "exact" });
    if (status) query = query.eq("trang_thai_thanh_toan", status);
    if (q) query = query.or(`ma_dat_san.ilike.%${q}%,ten_nguoi_dat.ilike.%${q}%,sdt_nguoi_dat.ilike.%${q}%`);
    query = query.order("ngay_dat", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
    const { data, count } = await query;
    const items: RefundBookingRow[] = (data ?? []).map((r) => ({ ...summaryFromView(r), refundStatus: r.trang_thai_thanh_toan as RefundBookingRow["refundStatus"] }));
    const result: Paged<RefundBookingRow> = { items, total: count ?? 0, page, pageSize: SIZE };
    return ok(result);
  });
}
