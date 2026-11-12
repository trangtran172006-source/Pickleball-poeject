import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, ok, requireRole } from "@/server/lib/http";
import { tsHcm } from "@/server/lib/ownerData";
const schema = z.object({ courtId: z.string(), reason: z.string(), startDate: z.string(), startTime: z.string(), endDate: z.string(), endTime: z.string() });
export async function POST(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const i = await body(req, schema);
    const { data } = await admin().rpc("fn_xem_truoc_dong_cua", { p_san: i.courtId, p_tu: tsHcm(i.startDate, i.startTime), p_den: tsHcm(i.endDate, i.endTime) });
    return ok({ affected: Number(data ?? 0) });
  });
}
