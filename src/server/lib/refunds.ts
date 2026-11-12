import { admin } from "./admin";
import { summaryFromView } from "./bookings";
import type { RefundDetail } from "@/shared/types";

export async function refundDetail(id: string): Promise<RefundDetail | null> {
  const { data: row } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
  if (!row) return null;
  const s = summaryFromView(row);
  const { data: g } = await admin().from("giao_dich_hoan_tien").select("nguyen_nhan,lua_chon_khach").eq("ma_dat_san", id).order("ngay_tao", { ascending: false }).limit(1).maybeSingle();
  const pstatus = row.trang_thai_thanh_toan as string;
  const paid = ["Đã thanh toán", "Chờ hoàn tiền", "Đã hoàn tiền"].includes(pstatus) ? Number(row.tong_tien) : 0;
  const eligible = s.status === "Đã hủy" && pstatus === "Chờ hoàn tiền";
  return {
    id, code: id, bookerName: s.customerName, bookerPhone: s.customerPhone, createdAt: s.createdAt,
    courtName: s.courtName, date: s.date, start: s.start, end: s.end, paid,
    refundStatus: s.paymentStatus, cause: g?.nguyen_nhan ?? null, customerChoice: g?.lua_chon_khach ?? null, eligible,
  };
}
