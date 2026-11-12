import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireUser } from "@/server/lib/http";
import { vietQrPayload, bankInfo } from "@/server/lib/vietqr";
import type { PaymentInfo } from "@/shared/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireUser();
    const { id } = await params;
    const { data: row } = await admin().from("v_booking").select("*").eq("ma_dat_san", id).maybeSingle();
    if (!row) throw fail("BOOKING_NOT_FOUND", 404);
    if (acc.vai_tro === "customer" && row.ma_nguoi_dung !== acc.ma_nguoi_dung) throw fail("FORBIDDEN", 403);
    const amount = Number(row.tong_tien);
    const b = bankInfo();
    const info: PaymentInfo = {
      bookingId: id, code: id, amount, expiresAt: (row.hold_expires as string) ?? "",
      qrPayload: vietQrPayload(amount, id),
      bank: { name: b.bankName, holder: b.accountHolder, account: b.accountNumber, content: id },
    };
    return ok(info);
  });
}
