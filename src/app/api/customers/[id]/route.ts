import { admin } from "@/server/lib/admin";
import { fail, handler, ok, requireRole } from "@/server/lib/http";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["staff", "owner"]);
    const { id } = await params;
    const { data: c } = await admin().from("v_khach_hang")
      .select("id,ho_ten,sdt,email,co_tai_khoan").eq("id", id).maybeSingle();
    if (!c) throw fail("NOT_FOUND", 404);
    return ok({
      id: c.id as string, fullName: c.ho_ten as string, phone: c.sdt as string,
      email: (c.email as string) ?? "", online: !!c.co_tai_khoan, avatarUrl: null,
    });
  });
}
