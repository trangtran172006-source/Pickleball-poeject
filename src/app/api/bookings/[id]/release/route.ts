import { admin } from "@/server/lib/admin";
import { handler, noContent, requireUser } from "@/server/lib/http";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireUser();
    const { id } = await params;
    await admin().rpc("fn_giai_phong", { p_ma_dds: id });
    return noContent();
  });
}
