import { admin } from "@/server/lib/admin";
import { handler, ok, requireRole } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
import type { Paged, BookingSummary } from "@/shared/types";
const SIZE = 10;
export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const q = sp.get("q")?.trim(); const date = sp.get("date"); const courtId = sp.get("courtId");
    let query = admin().from("v_booking").select("*", { count: "exact" })
      .not("ma_dong_cua", "is", null).in("trang_thai_dat_san", ["Chờ xác nhận", "Đã xác nhận"])
      .or("lua_chon_xu_ly.is.null,lua_chon_xu_ly.eq.Dời lịch");
    if (date) query = query.eq("ngay_choi", date);
    if (courtId) query = query.eq("ma_san", courtId);
    if (q) query = query.or(`ma_dat_san.ilike.%${q}%,ten_nguoi_dat.ilike.%${q}%,sdt_nguoi_dat.ilike.%${q}%`);
    query = query.order("ngay_choi", { ascending: true }).range((page - 1) * SIZE, page * SIZE - 1);
    const { data, count } = await query;
    const result: Paged<BookingSummary> = { items: (data ?? []).map(summaryFromView), total: count ?? 0, page, pageSize: SIZE };
    return ok(result);
  });
}
