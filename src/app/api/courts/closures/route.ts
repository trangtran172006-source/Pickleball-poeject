import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, noContent, requireRole } from "@/server/lib/http";
import { tsHcm } from "@/server/lib/ownerData";
const schema = z.object({ courtId: z.string(), reason: z.enum(["Bảo trì", "Thời tiết", "Sự cố"]), startDate: z.string(), startTime: z.string(), endDate: z.string(), endTime: z.string() });
export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireRole(["owner"]);
    const i = await body(req, schema);
    const { error } = await admin().rpc("fn_dong_cua_san", { p_san: i.courtId, p_ly_do: i.reason, p_tu: tsHcm(i.startDate, i.startTime), p_den: tsHcm(i.endDate, i.endTime), p_nguoi: acc.ma_nguoi_dung });
    if (error) throw error;
    return noContent();
  });
}
