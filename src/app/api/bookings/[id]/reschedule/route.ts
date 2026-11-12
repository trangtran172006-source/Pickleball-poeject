import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole, requireShift } from "@/server/lib/http";
import { summaryFromView } from "@/server/lib/bookings";
import type { RescheduleResult, SlotRef } from "@/shared/types";
const schema = z.object({ courtId: z.string(), date: z.string(), start: z.string(), end: z.string() });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["staff", "owner"]);
    if (acc.vai_tro === "staff") await requireShift(acc);
    const { id } = await params;
    const i = await body(req, schema);
    const { data: before } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
    if (!before || !before.ma_chi_tiet) throw fail("BOOKING_NOT_FOUND", 404);
    const fromRef: SlotRef = { courtName: (before.ten_san as string) ?? "", date: before.ngay_thue as string, start: String(before.gio_bd).slice(0, 5), end: String(before.gio_kt).slice(0, 5) };
    const { error } = await admin().rpc("fn_doi_lich", { p_ma_ct: before.ma_chi_tiet, p_san: i.courtId, p_ngay: i.date, p_bd: i.start, p_kt: i.end, p_nguoi: acc.ma_nguoi_dung });
    if (error) throw error;
    const { data: after } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
    const s = summaryFromView(after!);
    const result: RescheduleResult = {
      booking: s, from: fromRef, to: { courtName: s.courtName, date: i.date, start: i.start, end: i.end },
      pricePerHour: Math.round(s.amount / (s.hours || 1)), actorName: acc.ho_ten, at: new Date().toISOString(), reason: null,
    };
    return ok(result);
  });
}
