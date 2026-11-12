import { admin } from "./admin";
import { hcmClock, hcmToday } from "./http";
import type { BookingSummary, Pricing, PriceBand, Schedule, Slot, SlotState } from "@/shared/types";

export const OPEN = "05:00", CLOSE = "22:00", SLOT_MIN = 30, MIN_MIN = 60;

const hm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const isWeekend = (date: string) => [0, 6].includes(new Date(date + "T12:00:00Z").getUTCDay());

/** 30-min grid starts: 05:00 .. 21:30 */
export function slotStarts(): string[] {
  const out: string[] = [];
  for (let m = toMin(OPEN); m + SLOT_MIN <= toMin(CLOSE); m += SLOT_MIN) out.push(fromMin(m));
  return out;
}

type PriceMap = Record<string, Record<string, { weekday: number; weekend: number }>>;

export async function pricingData() {
  const [{ data: courts }, { data: bandsRaw }, { data: cells }] = await Promise.all([
    admin().from("san").select("ma_san,ten_san").order("ma_san"),
    admin().from("khung_gio").select("ma_khung_gio,gio_bat_dau,gio_ket_thuc").order("gio_bat_dau"),
    admin().from("san_gia_thue").select("ma_san,gia_thue(ma_khung_gio,loai_ngay,muc_gia)"),
  ]);
  const bands: PriceBand[] = (bandsRaw ?? []).map((b) => ({ id: b.ma_khung_gio, start: hm(b.gio_bat_dau), end: hm(b.gio_ket_thuc) }));
  const map: PriceMap = {};
  for (const row of cells ?? []) {
    const g = (row as unknown as { gia_thue: { ma_khung_gio: string; loai_ngay: string; muc_gia: number } }).gia_thue;
    const court = (row as { ma_san: string }).ma_san;
    map[court] ??= {};
    map[court][g.ma_khung_gio] ??= { weekday: 0, weekend: 0 };
    if (g.loai_ngay === "T7-CN") map[court][g.ma_khung_gio].weekend = Number(g.muc_gia);
    else map[court][g.ma_khung_gio].weekday = Number(g.muc_gia);
  }
  const bandOf = (cellStart: string) => bands.find((b) => toMin(b.start) <= toMin(cellStart) && toMin(cellStart) < toMin(b.end));
  const priceCell = (court: string, cellStart: string, weekend: boolean) => {
    const b = bandOf(cellStart);
    if (!b) return 0;
    const p = map[court]?.[b.id];
    return p ? (weekend ? p.weekend : p.weekday) : 0;
  };
  const pricing: Pricing = {
    bands,
    courts: (courts ?? []).map((c) => ({
      id: c.ma_san,
      name: c.ten_san,
      prices: Object.fromEntries(bands.map((b) => [b.id, map[c.ma_san]?.[b.id] ?? { weekday: 0, weekend: 0 }])),
    })),
  };
  return { bands, courts: courts ?? [], priceCell, pricing };
}

export async function buildSchedule(date: string): Promise<Schedule> {
  await admin().rpc("fn_don_dep");
  const { courts, priceCell } = await pricingData();
  const weekend = isWeekend(date);
  const today = hcmToday();
  const nowClock = hcmClock();
  const starts = slotStarts();

  const [{ data: active }, { data: closures }] = await Promise.all([
    admin().from("chi_tiet_dat_san").select("ma_san,gio_bd,gio_kt").eq("ngay_thue", date).eq("hieu_luc", true),
    admin().from("lich_dong_cua_san").select("ma_san,bat_dau,ket_thuc"),
  ]);

  const occupied = new Map<string, Set<number>>(); // court -> set of cell-start minutes
  for (const a of active ?? []) {
    const set = occupied.get(a.ma_san) ?? new Set<number>();
    for (let m = toMin(a.gio_bd); m < toMin(a.gio_kt); m += SLOT_MIN) set.add(m);
    occupied.set(a.ma_san, set);
  }
  const closedCell = (court: string, cellStart: string) => {
    const cellTs = new Date(`${date}T${cellStart}:00+07:00`).getTime();
    return (closures ?? []).some(
      (c) => c.ma_san === court && new Date(c.bat_dau).getTime() <= cellTs && cellTs < new Date(c.ket_thuc).getTime(),
    );
  };

  const scheduleCourts = courts.map((c) => {
    const slots: Slot[] = starts.map((start) => {
      const end = fromMin(toMin(start) + SLOT_MIN);
      let status: SlotState = "free";
      if (date < today || (date === today && end + ":00" <= nowClock)) status = "past";
      else if (closedCell(c.ma_san, start)) status = "maintenance";
      else if (occupied.get(c.ma_san)?.has(toMin(start))) status = "booked";
      return { start, end, status, price: priceCell(c.ma_san, start, weekend) };
    });
    return { id: c.ma_san, name: c.ten_san, slots };
  });

  const { bands } = await pricingData();
  return { date, today, openTime: OPEN, closeTime: CLOSE, slotMinutes: SLOT_MIN, minMinutes: MIN_MIN, bands, courts: scheduleCourts };
}

type ViewRow = Record<string, unknown>;
/** Maps a v_booking row to the BookingSummary contract. */
export function summaryFromView(r: ViewRow): BookingSummary {
  const start = r.gio_bd ? String(r.gio_bd).slice(0, 5) : "";
  const end = r.gio_kt ? String(r.gio_kt).slice(0, 5) : "";
  const date = (r.ngay_thue as string) ?? (r.ngay_choi as string);
  const status = r.trang_thai_dat_san as BookingSummary["status"];
  const startTs = date && start ? new Date(`${date}T${start}:00+07:00`).getTime() : 0;
  const canCancel = ["Chờ xác nhận", "Đã xác nhận"].includes(status) && startTs > Date.now();
  return {
    id: r.ma_dat_san as string,
    code: r.ma_dat_san as string,
    createdAt: r.ngay_dat as string,
    courtId: (r.ma_san as string) ?? "",
    courtName: (r.ten_san as string) ?? "",
    date,
    start,
    end,
    hours: Number(r.tong_gio ?? 0),
    amount: Number(r.tong_tien ?? 0),
    status,
    paymentStatus: r.trang_thai_thanh_toan as BookingSummary["paymentStatus"],
    canCancel,
    customerName: r.ten_nguoi_dat as string,
    customerPhone: r.sdt_nguoi_dat as string,
    holdExpiresAt: (r.hold_expires as string) ?? null,
    checkedInAt: (r.da_nhan_san_luc as string) ?? null,
    affectedReason: (r.closure_reason as BookingSummary["affectedReason"]) ?? null,
  };
}

import type { BookingDetail, HistoryEvent, HistoryEventType } from "@/shared/types";

const EVENT_TYPE: Record<string, HistoryEventType> = {
  "Chờ xác nhận": "create", "Đã xác nhận": "paid", "Dời lịch": "reschedule",
  "Đã hủy – hoàn tiền": "refund",
};
function eventType(trang_thai: string, ly_do: string | null): HistoryEventType {
  if (EVENT_TYPE[trang_thai]) return EVENT_TYPE[trang_thai];
  if (trang_thai === "Đã hủy") return (ly_do ?? "").includes("không hợp lệ") ? "invalid" : "cancel";
  return "create";
}

async function signed(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await admin().storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Full BookingDetail (summary + booker + payment + history + signed proofs). */
export async function bookingDetail(id: string, restrictUser?: string): Promise<BookingDetail | null> {
  const { data: row } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
  if (!row) return null;
  if (restrictUser && row.ma_nguoi_dung !== restrictUser) return null;
  const summary = summaryFromView(row);

  const { data: hist } = await admin().from("lich_su_thay_doi")
    .select("ma_lich_su,trang_thai,nguoi_thuc_hien,ly_do,thoi_gian")
    .eq("ma_dat_san", id).order("thoi_gian", { ascending: true });
  const actorIds = [...new Set((hist ?? []).map((h) => h.nguoi_thuc_hien).filter(Boolean))] as string[];
  const actors = new Map<string, { ho_ten: string; vai_tro: string }>();
  if (actorIds.length) {
    const { data: us } = await admin().from("nguoi_dung").select("ma_nguoi_dung,ho_ten,vai_tro").in("ma_nguoi_dung", actorIds);
    for (const u of us ?? []) actors.set(u.ma_nguoi_dung, u);
  }
  const history: HistoryEvent[] = (hist ?? []).map((h) => {
    const a = h.nguoi_thuc_hien ? actors.get(h.nguoi_thuc_hien) : null;
    return {
      id: h.ma_lich_su, type: eventType(h.trang_thai, h.ly_do), at: h.thoi_gian,
      actorName: a?.ho_ten ?? null, actorRole: (a?.vai_tro as HistoryEvent["actorRole"]) ?? "system",
      reason: h.ly_do ?? null, from: null, to: null, amount: null,
      bookingStatus: null, paymentStatus: null,
    };
  });

  const pstatus = row.trang_thai_thanh_toan as string;
  const paid = ["Đã thanh toán", "Chờ hoàn tiền", "Đã hoàn tiền"].includes(pstatus) ? Number(row.tong_tien) : 0;
  const refunded = row.refund_status === "Đã hoàn tiền" ? Number(row.refund_amount ?? 0) : 0;
  return {
    ...summary,
    booker: { name: row.ten_nguoi_dat as string, phone: row.sdt_nguoi_dat as string, email: (row.email_nguoi_dat as string) ?? "" },
    note: (row.ghi_chu as string) ?? "",
    paymentMethod: (row.phuong_thuc as string) ?? "Chuyển khoản",
    paid, refunded, net: paid - refunded,
    proofUrl: await signed("payment-proofs", row.minh_chung as string),
    refundProofUrl: await signed("refund-proofs", row.refund_proof as string),
    history,
  };
}
