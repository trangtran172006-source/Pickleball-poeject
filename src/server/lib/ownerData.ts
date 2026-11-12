import { admin } from "./admin";
import { fail } from "./http";

/** Sets the per-30-min price for (court, band, day type). */
export async function setPrice(input: { courtId: string; dayGroup: "T2-T6" | "T7-CN"; bandId: string; price: number }) {
  const { data } = await admin()
    .from("san_gia_thue")
    .select("ma_gia,gia_thue(ma_khung_gio,loai_ngay)")
    .eq("ma_san", input.courtId);
  const row = (data ?? []).find((r) => {
    const g = (r as unknown as { gia_thue: { ma_khung_gio: string; loai_ngay: string } }).gia_thue;
    return g.ma_khung_gio === input.bandId && g.loai_ngay === input.dayGroup;
  });
  if (!row) throw fail("NOT_FOUND", 404);
  await admin().from("gia_thue").update({ muc_gia: input.price }).eq("ma_gia", (row as { ma_gia: string }).ma_gia);
}

import { SHIFT_DEFS } from "./shifts";
import type { PriceCell, CourtStatusRow, ShiftRow, BankSettings } from "@/shared/types";

export const tsHcm = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();

export async function priceCells(): Promise<PriceCell[]> {
  const { data } = await admin().from("san_gia_thue").select("ma_san,gia_thue(ma_khung_gio,loai_ngay,muc_gia)");
  return (data ?? []).map((r) => {
    const g = (r as unknown as { gia_thue: { ma_khung_gio: string; loai_ngay: "T2-T6" | "T7-CN"; muc_gia: number } }).gia_thue;
    return { courtId: (r as { ma_san: string }).ma_san, dayGroup: g.loai_ngay, bandId: g.ma_khung_gio, price: Number(g.muc_gia) };
  });
}

export async function courtStatusList(): Promise<CourtStatusRow[]> {
  const { data } = await admin().from("san").select("ma_san,ten_san,trang_thai,kiem_tra_luc").order("ma_san");
  return (data ?? []).map((c) => ({ id: c.ma_san, name: c.ten_san, status: c.trang_thai, checkedAt: c.kiem_tra_luc }));
}

export function shiftRowFrom(r: Record<string, unknown>, nowIso: string, staffName: string): ShiftRow {
  const date = r.ngay_lam_viec as string;
  const start = (r.gio_bat_dau_ca as string).slice(0, 5);
  const end = (r.gio_ket_thuc_ca as string).slice(0, 5);
  const status = r.trang_thai as ShiftRow["status"];
  const startTs = new Date(`${date}T${start}:00+07:00`).toISOString();
  const isPast = new Date(`${date}T${end}:00+07:00`).toISOString() < nowIso;
  const deletable = status === "Chưa hoàn thiện" && startTs > nowIso;
  const lockReason: ShiftRow["lockReason"] = status === "Đã hoàn thiện" ? "done" : isPast ? "past" : null;
  return {
    id: r.ma_ca_lam as string, code: r.ma_ca_lam as string, date, staffName,
    staffCode: r.ma_nhan_vien as string, start, end, status, deletable, lockReason,
  };
}
export function shiftNameFor(start: string): "Ca sáng" | "Ca chiều" | "Ca tối" {
  const def = SHIFT_DEFS.find((d) => start >= d.start && start < d.end);
  return (def?.name ?? "Ca sáng") as "Ca sáng" | "Ca chiều" | "Ca tối";
}
export async function bankGet(): Promise<BankSettings> {
  const { data } = await admin().from("cau_hinh").select("*").maybeSingle();
  return {
    bankName: data?.ngan_hang ?? "", bankBin: data?.ma_bin ?? "", holder: data?.chu_tai_khoan ?? "",
    account: data?.so_tai_khoan ?? "", hotline: data?.hotline ?? "",
  };
}
