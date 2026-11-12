import { admin } from "./admin";
import { hcmClock, hcmToday } from "./http";
import type { ShiftName, ShiftToday } from "@/shared/types";

export const SHIFT_DEFS: Array<{ name: ShiftName; start: string; end: string }> = [
  { name: "Ca sáng", start: "05:00", end: "12:00" },
  { name: "Ca chiều", start: "12:00", end: "17:00" },
  { name: "Ca tối", start: "17:00", end: "22:00" },
];

export async function shiftToday(ma_nguoi_dung: string): Promise<ShiftToday> {
  const date = hcmToday();
  const now = hcmClock();
  const { data: rows } = await admin().from("dang_ky_ca_lam")
    .select("ma_ca_lam,ten_ca,gio_bat_dau_ca,gio_ket_thuc_ca")
    .eq("ma_nguoi_dung", ma_nguoi_dung).eq("ngay_lam_viec", date);
  // which assigned shift (if any) is checked in
  let checkedIn: ShiftToday["checkedIn"] = null;
  for (const r of rows ?? []) {
    const { data: li } = await admin().from("lich_su_ca_lam").select("ma_lich_su_ca").eq("ma_ca_lam", r.ma_ca_lam).limit(1);
    if ((li ?? []).length > 0) {
      checkedIn = { name: r.ten_ca, start: (r.gio_bat_dau_ca as string).slice(0, 5), end: (r.gio_ket_thuc_ca as string).slice(0, 5) };
      break;
    }
  }
  const shifts = SHIFT_DEFS.map((def) => {
    const row = (rows ?? []).find((r) => r.ten_ca === def.name);
    const inHours = def.start <= now.slice(0, 5) && now.slice(0, 5) < def.end;
    return { id: row?.ma_ca_lam ?? null, name: def.name, start: def.start, end: def.end, assigned: !!row, inHours };
  });
  return { date, checkedIn, shifts };
}
