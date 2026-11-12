import { admin } from "@/server/lib/admin";
import { handler, ok, requireRole } from "@/server/lib/http";
export async function GET() {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const { data } = await admin().from("san").select("ma_san,ten_san,trang_thai").order("ma_san");
    return ok((data ?? []).map((c) => ({ id: c.ma_san, name: c.ten_san, status: c.trang_thai })));
  });
}
