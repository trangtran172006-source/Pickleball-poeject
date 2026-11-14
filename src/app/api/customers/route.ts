import { admin } from "@/server/lib/admin";
import { handler, ok, requireRole } from "@/server/lib/http";
import type { Paged, CustomerRow } from "@/shared/types";
const SIZE = 10;
export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    // v_khach_hang = tài khoản khách đã đăng ký + khách vãng lai đã đặt sân (đồng nhất nguồn dữ liệu)
    let query = admin().from("v_khach_hang").select("id,ho_ten,sdt,email,co_tai_khoan", { count: "exact" });
    if (q) query = query.or(`ho_ten.ilike.%${q}%,sdt.ilike.%${q}%,email.ilike.%${q}%`);
    const { data, count } = await query.order("ho_ten").range((page - 1) * SIZE, page * SIZE - 1);
    const items: CustomerRow[] = (data ?? []).map((c) => ({
      id: c.id as string, fullName: c.ho_ten as string, phone: c.sdt as string,
      email: (c.email as string) ?? "", online: !!c.co_tai_khoan, avatarUrl: null,
    }));
    const result: Paged<CustomerRow> = { items, total: count ?? 0, page, pageSize: SIZE };
    return ok(result);
  });
}
