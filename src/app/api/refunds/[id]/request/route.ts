import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok, requireRole } from "@/server/lib/http";
import { refundDetail } from "@/server/lib/refunds";
const schema = z.object({ cause: z.string().trim().min(1), customerChoice: z.string().trim().min(1) });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    const acc = await requireRole(["owner"]);
    const { id } = await params;
    const i = await body(req, schema);
    const { error } = await admin().rpc("fn_yeu_cau_hoan_tien", { p_ma_dds: id, p_nguyen_nhan: i.cause, p_lua_chon: i.customerChoice, p_nguoi: acc.ma_nguoi_dung });
    if (error) throw error;
    const d = await refundDetail(id); if (!d) throw fail("BOOKING_NOT_FOUND", 404);
    return ok(d);
  });
}
