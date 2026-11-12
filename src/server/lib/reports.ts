import { admin } from "./admin";
import { summaryFromView } from "./bookings";
import type { CourtReport, CourtReportRow, ProductReport, ProductReportRow, ReportPeriod } from "@/shared/types";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const anchor = (ymd: string) => new Date(ymd + "T12:00:00Z");

/** Resolves a report period to an inclusive date range + a Vietnamese label. */
export function periodRange(period: ReportPeriod, date?: string, from?: string, to?: string): { from: string; to: string; label: string } {
  if (period === "range" && from && to) return { from, to, label: `${vn(from)} – ${vn(to)}` };
  const base = anchor(date ?? iso(new Date()));
  if (period === "day") { const d = iso(base); return { from: d, to: d, label: `Ngày ${vn(d)}` }; }
  if (period === "week") {
    const dow = (base.getUTCDay() + 6) % 7; // Monday=0
    const mon = new Date(base); mon.setUTCDate(base.getUTCDate() - dow);
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
    return { from: iso(mon), to: iso(sun), label: `Tuần ${vn(iso(mon))} – ${vn(iso(sun))}` };
  }
  if (period === "month") {
    const f = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12));
    const t = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12));
    return { from: iso(f), to: iso(t), label: `Tháng ${base.getUTCMonth() + 1}/${base.getUTCFullYear()}` };
  }
  const f = new Date(Date.UTC(base.getUTCFullYear(), 0, 1, 12)), t = new Date(Date.UTC(base.getUTCFullYear(), 11, 31, 12));
  return { from: iso(f), to: iso(t), label: `Năm ${base.getUTCFullYear()}` };
}
const vn = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const dayStart = (d: string) => `${d}T00:00:00+07:00`;
const dayEnd = (d: string) => `${d}T23:59:59+07:00`;

export async function courtReport(period: ReportPeriod, date?: string, from?: string, to?: string): Promise<CourtReport> {
  const r = periodRange(period, date, from, to);
  const { data } = await admin().from("v_booking").select("*")
    .gte("ngay_choi", r.from).lte("ngay_choi", r.to)
    .in("trang_thai_thanh_toan", ["Đã thanh toán", "Chờ hoàn tiền", "Đã hoàn tiền"])
    .order("ngay_choi", { ascending: true });
  const rows: CourtReportRow[] = (data ?? []).map((b) => {
    const s = summaryFromView(b);
    return { code: s.code, customerName: s.customerName, date: s.date, start: s.start, end: s.end, courtName: s.courtName, minutes: Math.round(s.hours * 60), amount: s.amount };
  });
  const totalMinutes = rows.reduce((a, x) => a + x.minutes, 0);
  const refunds = (data ?? []).filter((b) => b.trang_thai_thanh_toan === "Đã hoàn tiền").reduce((a, b) => a + Number(b.tong_tien), 0);
  const total = (data ?? []).reduce((a, b) => a + Number(b.tong_tien), 0);
  return { periodLabel: r.label, rows, totalMinutes, refunds, total };
}

export async function productReport(period: ReportPeriod, date?: string, from?: string, to?: string): Promise<ProductReport> {
  const r = periodRange(period, date, from, to);
  const { data } = await admin().from("ct_don_hhdv")
    .select("so_luong,don_gia,thanh_tien,hang_hoa_dich_vu(ten_hhdv,loai),don_hhdv!inner(ngay_tao)")
    .gte("don_hhdv.ngay_tao", dayStart(r.from)).lte("don_hhdv.ngay_tao", dayEnd(r.to))
    .order("ngay_tao", { foreignTable: "don_hhdv", ascending: true });
  const rows: ProductReportRow[] = (data ?? []).map((x) => {
    const p = (x as unknown as { hang_hoa_dich_vu: { ten_hhdv: string; loai: ProductReportRow["type"] } }).hang_hoa_dich_vu;
    const o = (x as unknown as { don_hhdv: { ngay_tao: string } }).don_hhdv;
    return { name: p.ten_hhdv, type: p.loai, unitPrice: Number((x as { don_gia: number }).don_gia), orderedAt: o.ngay_tao, quantity: Number((x as { so_luong: number }).so_luong), amount: Number((x as { thanh_tien: number }).thanh_tien) };
  });
  const totalGoodsQty = rows.filter((x) => x.type === "Hàng hóa").reduce((a, x) => a + x.quantity, 0);
  const totalServiceQty = rows.filter((x) => x.type === "Dịch vụ").reduce((a, x) => a + x.quantity, 0);
  const total = rows.reduce((a, x) => a + x.amount, 0);
  return { periodLabel: r.label, rows, totalGoodsQty, totalServiceQty, total };
}
