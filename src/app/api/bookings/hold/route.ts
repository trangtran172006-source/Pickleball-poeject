import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireShift, requireUser } from "@/server/lib/http";
import type { Hold } from "@/shared/types";

const schema = z.object({
  courtId: z.string(), date: z.string(), start: z.string(), end: z.string(),
  fullName: z.string().trim().min(1), phone: z.string().regex(/^0\d{9}$/),
  email: z.string().email().or(z.literal("")), note: z.string().max(255).default(""),
});

export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireUser();
    if (acc.vai_tro === "staff") await requireShift(acc);
    const input = await body(req, schema);
    let p_user: string | null = null;
    let p_nguoi_tao: string | null = null;
    if (acc.vai_tro === "customer") {
      p_user = acc.ma_nguoi_dung;
    } else {
      p_nguoi_tao = acc.ma_nguoi_dung;
      // match a walk-in to an existing customer by phone/email
      const { data } = await admin().from("nguoi_dung").select("ma_nguoi_dung")
        .eq("vai_tro", "customer").or(`so_dien_thoai.eq.${input.phone}${input.email ? `,email.eq.${input.email}` : ""}`).limit(1);
      p_user = data && data[0] ? data[0].ma_nguoi_dung : null;
    }
    const { data: res, error } = await admin().rpc("fn_giu_cho", {
      p_user, p_ten: input.fullName, p_sdt: input.phone, p_email: input.email || null,
      p_items: [{ ma_san: input.courtId, ngay: input.date, gio_bd: input.start, gio_kt: input.end }],
      p_nguoi_tao, p_ghi_chu: input.note || null,
    });
    if (error) throw error;
    const r = res as { ma_dat_san: string; tong_tien: number; het_han: string };
    const hold: Hold = { bookingId: r.ma_dat_san, code: r.ma_dat_san, expiresAt: r.het_han, total: Number(r.tong_tien) };
    return ok(hold);
  });
}
