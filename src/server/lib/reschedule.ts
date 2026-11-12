import { admin } from "./admin";
import { hcmClock, hcmToday } from "./http";
import { summaryFromView, pricingData, slotStarts, OPEN, CLOSE } from "./bookings";
import type { RescheduleOptions, RescheduleOption, RescheduleOptionState, SlotRef } from "@/shared/types";

const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export async function rescheduleOptions(id: string, courtIdQ?: string, dateQ?: string): Promise<RescheduleOptions | null> {
  const { data: row } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
  if (!row) return null;
  const s = summaryFromView(row);
  const duration = toMin(s.end) - toMin(s.start);
  const pricePerHour = Math.round(s.amount / (duration / 60));
  const courtId = courtIdQ || s.courtId;
  const date = dateQ || s.date;
  const today = hcmToday();
  const nowHH = hcmClock().slice(0, 5);

  const [{ data: san }, { data: active }, { data: closures }, pricing] = await Promise.all([
    admin().from("san").select("ma_san,ten_san,trang_thai").order("ma_san"),
    admin().from("chi_tiet_dat_san").select("gio_bd,gio_kt").eq("ma_san", courtId).eq("ngay_thue", date).eq("hieu_luc", true).neq("ma_dat_san", id),
    admin().from("lich_dong_cua_san").select("bat_dau,ket_thuc").eq("ma_san", courtId),
    pricingData(),
  ]);
  const courtClosed = (san ?? []).find((c) => c.ma_san === courtId)?.trang_thai === "Đóng cửa";
  const weekend = [0, 6].includes(new Date(date + "T12:00:00Z").getUTCDay());
  const overlapsActive = (a: string, b: string) => (active ?? []).some((x) => toMin(x.gio_bd as string) < toMin(b) && toMin(a) < toMin(x.gio_kt as string));
  const overlapsClosure = (a: string, b: string) => {
    const s0 = new Date(`${date}T${a}:00+07:00`).getTime(), e0 = new Date(`${date}T${b}:00+07:00`).getTime();
    return (closures ?? []).some((c) => new Date(c.bat_dau).getTime() < e0 && s0 < new Date(c.ket_thuc).getTime());
  };
  const priceBlock = (a: string, b: string) => {
    let sum = 0;
    for (let m = toMin(a); m < toMin(b); m += 30) sum += pricing.priceCell(courtId, fromMin(m), weekend);
    return sum;
  };

  const options: RescheduleOption[] = [];
  for (let m = toMin(OPEN); m + duration <= toMin(CLOSE); m += 30) {
    const start = fromMin(m), end = fromMin(m + duration);
    let state: RescheduleOptionState;
    if (date < today || (date === today && end <= nowHH)) state = "past";
    else if (courtClosed || overlapsClosure(start, end)) state = "closed";
    else if (overlapsActive(start, end)) state = "booked";
    else state = priceBlock(start, end) !== s.amount ? "price" : "ok";
    options.push({ start, end, pricePerHour: Math.round(priceBlock(start, end) / (duration / 60)), state });
  }
  return {
    booking: { ...s, pricePerHour },
    courts: (san ?? []).map((c) => ({ id: c.ma_san, name: c.ten_san })),
    courtId, date, today, options,
  };
}

export function slotRefOf(courtName: string, r: { date: string; start: string; end: string }): SlotRef {
  return { courtName, date: r.date, start: r.start, end: r.end };
}
