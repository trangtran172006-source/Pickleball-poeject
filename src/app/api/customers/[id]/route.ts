import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireRole } from "@/server/lib/http";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const { id } = await params;
    const { data: c } = await admin().from("nguoi_dung")
      .select("ma_nguoi_dung,ho_ten,so_dien_thoai,email,da_xac_thuc").eq("ma_nguoi_dung", id).eq("vai_tro", "customer").maybeSingle();
    if (!c) throw fail("NOT_FOUND", 404);
    return ok({ id: c.ma_nguoi_dung, fullName: c.ho_ten, phone: c.so_dien_thoai, email: c.email, online: !!c.da_xac_thuc, avatarUrl: null });
  });
}
