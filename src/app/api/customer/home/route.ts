import { admin } from "@/server/lib/admin";
import { handler, hcmToday, ok, requireRole } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
export async function GET() {
  return handler(async () => {
    const acc = await requireRole(["customer"]);
    const today = hcmToday();
    const { data } = await admin().from("v_booking").select("*")
      .eq("ma_nguoi_dung", acc.ma_nguoi_dung)
      .in("trang_thai_dat_san", ["Chờ xác nhận", "Đã xác nhận"])
      .gte("ngay_choi", today).order("ngay_choi", { ascending: true }).limit(1);
    const upcoming = data && data[0] ? summaryFromView(data[0]) : null;
    const suggestions = [
      { date: today, time: "18:00" },
      { date: today, time: "19:30" },
      { date: today, time: "06:00" },
    ];
    return ok({ today, suggestions, upcoming });
  });
}
