import { admin } from "./admin";
import { hcmClock, hcmToday } from "./http";
import { summaryFromView, slotStarts } from "./bookings";
import { SHIFT_DEFS } from "./shifts";
import type { OwnerHome, StaffHome, BookingSummary, ShiftTask, QueueState } from "@/shared/types";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dayStart = (d: string) => `${d}T00:00:00+07:00`;
const dayEnd = (d: string) => `${d}T23:59:59+07:00`;
const shiftLabelNow = (clock: string) => SHIFT_DEFS.find((d) => d.start <= clock && clock < d.end)?.name ?? "—";
const PAID = ["Đã thanh toán", "Chờ hoàn tiền", "Đã hoàn tiền"];
const pct = (cur: number, prev: number) => (prev <= 0 ? 0 : Math.round(((cur - prev) / prev) * 100));

export async function ownerHome(): Promise<OwnerHome> {
  const today = hcmToday();
  const clock = hcmClock();
  const hhmm = clock.slice(0, 5);
  const d7 = isoDate(new Date(new Date(today + "T12:00:00Z").getTime() - 6 * 864e5));
  const yday = isoDate(new Date(new Date(today + "T12:00:00Z").getTime() - 864e5));

  const [{ data: todayB }, { data: b7 }, { data: o7 }, { data: san }, { data: nowChi }, { data: shiftsNow }, { count: pendRefund }] = await Promise.all([
    admin().from("v_booking").select("*").eq("ngay_choi", today),
    admin().from("v_booking").select("ngay_choi,tong_tien,trang_thai_thanh_toan").gte("ngay_choi", d7).lte("ngay_choi", today),
    admin().from("don_hhdv").select("ngay_tao,tong_tien").gte("ngay_tao", dayStart(d7)).lte("ngay_tao", dayEnd(today)),
    admin().from("san").select("ma_san,ten_san,trang_thai"),
    admin().from("chi_tiet_dat_san").select("ma_san,gio_bd,gio_kt").eq("ngay_thue", today).eq("hieu_luc", true),
    admin().from("dang_ky_ca_lam").select("ma_nguoi_dung").eq("ngay_lam_viec", today),
    admin().from("v_booking").select("ma_dat_san", { count: "exact", head: true }).eq("trang_thai_thanh_toan", "Chờ hoàn tiền"),
  ]);

  const dayRev = (day: string) => {
    const court = (b7 ?? []).filter((b) => b.ngay_choi === day && PAID.includes(b.trang_thai_thanh_toan as string) && b.trang_thai_thanh_toan !== "Đã hoàn tiền").reduce((a, b) => a + Number(b.tong_tien), 0);
    const ord = (o7 ?? []).filter((o) => (o.ngay_tao as string).slice(0, 10) === day).reduce((a, o) => a + Number(o.tong_tien), 0);
    return court + ord;
  };
  const revenue7: Array<{ date: string; amount: number }> = [];
  for (let i = 6; i >= 0; i--) { const dd = isoDate(new Date(new Date(today + "T12:00:00Z").getTime() - i * 864e5)); revenue7.push({ date: dd, amount: dayRev(dd) }); }
  const revenueToday = dayRev(today);
  const revenue7Total = revenue7.reduce((a, x) => a + x.amount, 0);

  const confirmed = (todayB ?? []).filter((b) => ["Đã xác nhận", "Đã hoàn tất"].includes(b.trang_thai_dat_san as string)).length;
  const pendingCount = (todayB ?? []).filter((b) => b.trang_thai_dat_san === "Chờ xác nhận").length;

  const inUseCourts = new Set((nowChi ?? []).filter((c) => (c.gio_bd as string).slice(0, 5) <= hhmm && hhmm < (c.gio_kt as string).slice(0, 5)).map((c) => c.ma_san));
  const activeCourts = (san ?? []).filter((s) => s.trang_thai === "Đang hoạt động");
  const maintenance = (san ?? []).filter((s) => s.trang_thai === "Đóng cửa").length;
  const inUse = [...inUseCourts].filter((id) => activeCourts.some((s) => s.ma_san === id)).length;
  const ready = activeCourts.length - inUse;
  const totalCells = Math.max(1, activeCourts.length * slotStarts().length);
  const bookedCells = (nowChi ?? []).reduce((a, c) => a + Math.round((toMin(c.gio_kt as string) - toMin(c.gio_bd as string)) / 30), 0);

  const staffOnDuty = new Set((shiftsNow ?? []).map((s) => s.ma_nguoi_dung)).size; // simplified: assigned today

  return {
    date: today, shiftLabel: shiftLabelNow(hhmm),
    revenueToday, revenueTodayDelta: pct(revenueToday, dayRev(yday)),
    bookings: (todayB ?? []).length, bookingsConfirmed: confirmed, bookingsPending: pendingCount,
    occupancy: Math.round((bookedCells / totalCells) * 100), occupancyDelta: 0,
    courtsActive: activeCourts.length, courtsTotal: (san ?? []).length, courtsFreeNow: ready,
    revenue7Total, revenue7Delta: 0, revenue7,
    courtState: { inUse, ready, maintenance },
    today: (todayB ?? []).map((b) => { const s = summaryFromView(b); return { id: s.id, customerName: s.customerName, courtName: s.courtName, start: s.start, end: s.end, status: s.status, amount: s.amount }; }),
    attention: (pendRefund ?? 0) + pendingCount, staffOnDuty, updatedAt: new Date().toISOString(),
  };
}
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);

export async function staffHome(ma: string, shift: { name: string; start: string; end: string; ma_ca_lam: string } | null): Promise<StaffHome> {
  const today = hcmToday();
  const hhmm = hcmClock().slice(0, 5);
  const { data: todayB } = await admin().from("v_booking").select("*").eq("ngay_choi", today);
  const rows = (todayB ?? []).map(summaryFromView);
  const confirmed = rows.filter((b) => b.status === "Đã xác nhận");
  const awaitingCheckIn = confirmed.filter((b) => !b.checkedInAt && b.start >= hhmm);
  const inUse = confirmed.filter((b) => b.checkedInAt && b.start <= hhmm && hhmm < b.end);
  const awaitingPayment = rows.filter((b) => b.status === "Chờ xác nhận" && b.holdExpiresAt && b.holdExpiresAt > new Date().toISOString());
  const upcoming = confirmed.filter((b) => b.start >= hhmm).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming2h = upcoming.filter((b) => toMin(b.start) - toMin(hhmm) <= 120).length;

  const { data: san } = await admin().from("san").select("ma_san,ten_san,trang_thai");
  const busyNow = new Set(inUse.map((b) => b.courtId));
  const courtsReady = (san ?? []).filter((s) => s.trang_thai === "Đang hoạt động" && !busyNow.has(s.ma_san)).map((s) => s.ten_san);

  // tasks for this shift
  let tasks: ShiftTask[] = [];
  if (shift) {
    const { data: defs } = await admin().from("viec_trong_ca").select("*").eq("ten_ca", shift.name).order("gio_thuc_hien");
    const { data: done } = await admin().from("viec_trong_ca_hoan_thanh").select("ma_viec,hoan_thanh_luc").eq("ma_ca_lam", shift.ma_ca_lam);
    const doneMap = new Map((done ?? []).map((d) => [d.ma_viec, d.hoan_thanh_luc]));
    tasks = (defs ?? []).map((v) => ({ id: v.ma_viec, name: v.ten_viec, time: v.gio_thuc_hien ? (v.gio_thuc_hien as string).slice(0, 5) : null, note: v.mo_ta ?? null, done: doneMap.has(v.ma_viec), doneAt: doneMap.get(v.ma_viec) ?? null }));
  }

  const queue: Array<{ booking: BookingSummary; state: QueueState }> = [
    ...awaitingPayment.map((b) => ({ booking: b, state: "awaitingPayment" as QueueState })),
    ...awaitingCheckIn.map((b) => ({ booking: b, state: "awaitingCheckIn" as QueueState })),
    ...inUse.map((b) => ({ booking: b, state: "inUse" as QueueState })),
  ];

  return {
    date: today,
    shift: shift ? { name: shift.name, start: shift.start, end: shift.end } : null,
    kpi: {
      bookings: rows.length, upcoming2h, awaitingCheckIn: awaitingCheckIn.length,
      nextAt: upcoming[0]?.start ?? null, awaitingPayment: awaitingPayment.length,
      toCollect: awaitingPayment.reduce((a, b) => a + b.amount, 0), courtsReady,
    },
    queue, tasks,
  };
}
