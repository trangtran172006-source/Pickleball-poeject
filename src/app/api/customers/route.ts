import { admin } from "@/server/lib/admin";
import { handler, ok, requireRole } from "@/server/lib/http";
import type { Paged, CustomerRow } from "@/shared/types";
const SIZE = 10;
export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim();
    if (!q) return ok({ items: [], total: 0, page: 1, pageSize: SIZE });
    const page = Math.max(1, Number(sp.get("page") || 1));
    const { data, count } = await admin().from("nguoi_dung")
      .select("ma_nguoi_dung,ho_ten,so_dien_thoai,email,da_xac_thuc,anh_dai_dien", { count: "exact" })
      .eq("vai_tro", "customer")
      .or(`ho_ten.ilike.%${q}%,so_dien_thoai.ilike.%${q}%,email.ilike.%${q}%`)
      .order("ho_ten").range((page - 1) * SIZE, page * SIZE - 1);
    const items: CustomerRow[] = (data ?? []).map((c) => ({
      id: c.ma_nguoi_dung, fullName: c.ho_ten, phone: c.so_dien_thoai, email: c.email,
      online: !!c.da_xac_thuc, avatarUrl: null,
    }));
    const result: Paged<CustomerRow> = { items, total: count ?? 0, page, pageSize: SIZE };
    return ok(result);
  });
}
