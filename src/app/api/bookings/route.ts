import { admin } from "@/server/lib/admin";
import { handler, ok, requireUser } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
import type { Paged, BookingSummary } from "@/shared/types";

const SIZE = 10;
export async function GET(req: Request) {
  return handler(async () => {
    const acc = await requireUser();
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const q = sp.get("q")?.trim();
    const date = sp.get("date");
    const status = sp.get("status");
    let query = admin().from("v_booking").select("*", { count: "exact" });
    if (acc.vai_tro === "customer") query = query.eq("ma_nguoi_dung", acc.ma_nguoi_dung);
    if (date) query = query.eq("ngay_choi", date);
    if (status) query = query.eq("trang_thai_dat_san", status);
    if (q) query = query.or(`ma_dat_san.ilike.%${q}%,ten_nguoi_dat.ilike.%${q}%,sdt_nguoi_dat.ilike.%${q}%`);
    query = query.order("ngay_dat", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
    const { data, count } = await query;
    const result: Paged<BookingSummary> = {
      items: (data ?? []).map(summaryFromView), total: count ?? 0, page, pageSize: SIZE,
    };
    return ok(result);
  });
}
